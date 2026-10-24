"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import data from "@/data/transformer-monitor-demo.json";

type Status = "inspect_now" | "review_needed" | "within_limits";
type Unit = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lon: number;
  rated: number;
  customers: number;
  status: Status;
  rule: string;
  reason: string;
  stability: string;
  peak: number;
  ratio: number;
  cpk: number | null;
  cpkCi: [number, number] | null;
  projected: number | null;
  forecastRatio: number | null;
  limits: { center: number | null; ucl: number | null; lcl: number | null; mr_bar: number | null; mr_ucl: number | null };
  peaks: (number | null)[];
  signals: { rule: string; date: string }[];
};
type Area = { id: string; name: string; kind: string; rings: number[][][][] };
type Rule = { rule: string; outcome: Status; reason: string; condition: string; count: number };

const demo = data as unknown as {
  period: { period_id: string; start: string; end: string; days: number; history_start: string; history_days: number };
  summary: Record<string, number>;
  dates: string[];
  forecast: { horizon: string; kwPerHeatPump: number; powerFactor: number; formula: string };
  rules: Rule[];
  areas: Area[];
  units: Unit[];
  alerts: Alert[];
  report: { status: string; rerunCount: number; exceptionsTotal: number; calibrationCasesInQueue: number; playbookVersion: string; steps: number };
};
type Alert = {
  id: number;
  createdAt: string;
  runId: string;
  periodId: string;
  step: number;
  stepName: string;
  level: "error" | "warning";
  title: string;
  meaning: string;
  action: string;
  details: string;
  delivered: string;
};

const TIER: Record<Status, { label: string; color: string; order: number }> = {
  inspect_now: { label: "Inspect now", color: "#d9574a", order: 0 },
  review_needed: { label: "Review needed", color: "#e0a23a", order: 1 },
  within_limits: { label: "Within limits", color: "#5fae7a", order: 2 },
};

const SIGNAL_LABEL: Record<string, string> = {
  beyond_3_sigma: "beyond 3σ",
  moving_range_beyond_ucl: "moving-range spike",
  two_of_three_beyond_2_sigma: "2 of 3 beyond 2σ",
  eight_in_a_row_one_side: "8 in a row one side",
};

/* ── Map projection: Web Mercator, fitted to the county's bounding box ──
   The same projection as the tile servers use, so basemap tiles line up. */

const W = 1300;
const H = 720;
const PAD = 24;
const TILE = 256;
const ringPts = demo.areas.flatMap((a) => a.rings.flat(2));
// World coordinates in [0, 1]: x east from the antimeridian, y south from the pole.
const wx = (lon: number) => (lon + 180) / 360;
const wy = (lat: number) => {
  const phi = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2;
};
const minLat = Math.min(...demo.units.map((u) => u.lat), ...ringPts.map((p) => p[1]));
const maxLat = Math.max(...demo.units.map((u) => u.lat), ...ringPts.map((p) => p[1]));
const minLon = Math.min(...demo.units.map((u) => u.lon), ...ringPts.map((p) => p[0]));
const maxLon = Math.max(...demo.units.map((u) => u.lon), ...ringPts.map((p) => p[0]));
const wx0 = wx(minLon);
const wy0 = wy(maxLat);
const scale = Math.min((W - 2 * PAD) / (wx(maxLon) - wx0), (H - 2 * PAD) / (wy(minLat) - wy0));
const offX = (W - (wx(maxLon) - wx0) * scale) / 2;
const offY = (H - (wy(minLat) - wy0) * scale) / 2;
const px = (lon: number) => offX + (wx(lon) - wx0) * scale;
const py = (lat: number) => offY + (wy(lat) - wy0) * scale;

/** Basemap tiles covering a viewBox, at the zoom where a tile is about TILE px on screen. */
function tilesFor(vx: number, vy: number, vw: number, vh: number) {
  const z = Math.max(8, Math.min(16, Math.round(Math.log2((scale * (W / vw)) / TILE))));
  const n = 2 ** z;
  const size = scale / n;
  const tx0 = Math.floor((wx0 + (vx - offX) / scale) * n);
  const tx1 = Math.floor((wx0 + (vx + vw - offX) / scale) * n);
  const ty0 = Math.floor((wy0 + (vy - offY) / scale) * n);
  const ty1 = Math.floor((wy0 + (vy + vh - offY) / scale) * n);
  const out: { key: string; href: string; x: number; y: number; size: number }[] = [];
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      out.push({
        key: `${z}/${tx}/${ty}`,
        href: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`,
        x: offX + (tx / n - wx0) * scale,
        y: offY + (ty / n - wy0) * scale,
        size,
      });
    }
  }
  return out;
}

const areaPaths = demo.areas.map((a) => {
  const pts = a.rings[0][0];
  return {
    ...a,
    d: a.rings
      .map((poly) => poly.map((ring) => `M${ring.map(([lon, lat]) => `${px(lon).toFixed(1)},${py(lat).toFixed(1)}`).join("L")}Z`).join(""))
      .join(""),
    centroid: [pts.reduce((s, p) => s + px(p[0]), 0) / pts.length, pts.reduce((s, p) => s + py(p[1]), 0) / pts.length] as const,
  };
});

const areaName = (id: string) => demo.areas.find((a) => a.id === id)?.name ?? id;
const shortArea = (id: string) => areaName(id).replace(/^(Town|City|Village) of /, "");
const fmt = (n: number | null | undefined, d = 1) => (n == null ? "—" : n.toFixed(d));

/* ── Dashboard figures, worked out once from the units' own daily peaks ── */

const PEAK_BANDS = [
  { key: "hi", label: "90% or more", color: TIER.inspect_now.color, test: (r: number) => r >= 0.9 },
  { key: "mid", label: "70 to 90%", color: TIER.review_needed.color, test: (r: number) => r >= 0.7 && r < 0.9 },
  { key: "lo", label: "Under 70%", color: TIER.within_limits.color, test: (r: number) => r < 0.7 },
];
const STABILITY = [
  { key: "stable", label: "Stable", color: TIER.within_limits.color },
  { key: "signal", label: "Unstable", color: TIER.inspect_now.color },
  { key: "insufficient_history", label: "Short history", color: TIER.review_needed.color },
];
const median = (xs: number[]) => {
  const a = [...xs].sort((p, q) => p - q);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const quantile = (xs: number[], q: number) => {
  const a = [...xs].sort((p, q2) => p - q2);
  return a[Math.min(a.length - 1, Math.floor(q * a.length))];
};
const DASH = (() => {
  const u = demo.units;
  const daily = demo.dates.map((date, i) => {
    const ratios = u.flatMap((x) => (x.peaks[i] == null ? [] : [(x.peaks[i] as number) / x.rated]));
    return {
      date,
      near: (100 * ratios.filter((r) => r >= 0.9).length) / ratios.length,
      signals: u.filter((x) => x.signals.some((sg) => sg.date === date)).length,
      median: 100 * median(ratios),
      q1: 100 * quantile(ratios, 0.25),
      q3: 100 * quantile(ratios, 0.75),
    };
  });
  const areas = demo.areas
    .map((a) => {
      const inArea = u.filter((x) => x.area === a.id);
      return {
        id: a.id,
        name: areaName(a.id),
        units: inArea.length,
        inspect_now: inArea.filter((x) => x.status === "inspect_now").length,
        review_needed: inArea.filter((x) => x.status === "review_needed").length,
        within_limits: inArea.filter((x) => x.status === "within_limits").length,
        maxRatio: Math.max(...inArea.map((x) => x.ratio)),
      };
    })
    .sort((a, b) => b.inspect_now - a.inspect_now || b.review_needed - a.review_needed);
  return {
    status: (Object.keys(TIER) as Status[]).map((k) => ({ key: k, label: TIER[k].label, color: TIER[k].color, count: demo.summary[k] })),
    stability: STABILITY.map((b) => ({ ...b, count: u.filter((x) => x.stability === b.key).length })),
    peak: PEAK_BANDS.map((b) => ({ ...b, count: u.filter((x) => b.test(x.ratio)).length })),
    daily,
    areas,
  };
})();

function Donut({ slices, title, onPick }: { slices: { key: string; label: string; color: string; count: number }[]; title: string; onPick?: (key: string) => void }) {
  const total = slices.reduce((s, x) => s + x.count, 0);
  const r = 40;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <figure className="tcm-pie">
      <svg viewBox="0 0 100 100" role="img" aria-label={`${title}: ${slices.map((x) => `${x.label} ${x.count}`).join(", ")}`}>
        {slices.map((x) => {
          const len = (x.count / total) * c;
          const el = <circle key={x.key} cx="50" cy="50" r={r} fill="none" stroke={x.color} strokeWidth="18" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform="rotate(-90 50 50)" />;
          acc += len;
          return el;
        })}
        <text x="50" y="54" className="tcm-pie__total">
          {total}
        </text>
      </svg>
      <figcaption>
        <h4>{title}</h4>
        <ul>
          {slices.map((x) => (
            <li key={x.key}>
              {onPick ? (
                <button type="button" onClick={() => onPick(x.key)}>
                  <i style={{ background: x.color }} /> {x.label} <b>{x.count}</b>
                </button>
              ) : (
                <span>
                  <i style={{ background: x.color }} /> {x.label} <b>{x.count}</b>
                </span>
              )}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

/** A small daily series over the 60-day window, with the reporting week shaded. */
function Trend({ title, sub, values, band, unit }: { title: string; sub: string; values: number[]; band?: [number, number][]; unit?: string }) {
  const w = 420;
  const h = 150;
  const m = { l: 34, r: 8, t: 10, b: 20 };
  const all = [...values, ...(band?.flat() ?? [])];
  const vmin = Math.min(...all);
  const vmax = Math.max(...all);
  const span = vmax - vmin || 1;
  const x = (i: number) => m.l + (i / (values.length - 1)) * (w - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - vmin) / span) * (h - m.t - m.b);
  const periodStart = demo.dates.indexOf(demo.period.start);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = band ? `${band.map(([lo], i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(lo).toFixed(1)}`).join("")}${[...band].reverse().map(([, hi], k) => `L${x(band.length - 1 - k).toFixed(1)},${y(hi).toFixed(1)}`).join("")}Z` : "";
  const ticks = [vmin, (vmin + vmax) / 2, vmax];
  const labelAt = [0, Math.floor(values.length / 2), values.length - 1];
  return (
    <figure className="tcm-trend">
      <figcaption>
        <h4>{title}</h4>
        <span>{sub}</span>
      </figcaption>
      <svg className="tcm-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${title}, daily`}>
        <rect x={x(periodStart)} y={m.t} width={w - m.r - x(periodStart)} height={h - m.t - m.b} className="tcm-chart__period" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} className="tcm-chart__grid" />
            <text x={m.l - 5} y={y(t) + 4} className="tcm-chart__tick">
              {t.toFixed(t >= 10 ? 0 : 1)}
            </text>
          </g>
        ))}
        {band && <path d={area} className="tcm-trend__band" />}
        <path d={line} className="tcm-chart__line" />
        {values.map((v, i) => (
          <circle key={demo.dates[i]} cx={x(i)} cy={y(v)} r={1.8} className="tcm-chart__pt">
            <title>
              {demo.dates[i]}: {v.toFixed(1)}
              {unit}
            </title>
          </circle>
        ))}
        {labelAt.map((i) => (
          <text key={i} x={x(i)} y={h - 5} className="tcm-chart__tick" textAnchor={i === 0 ? "start" : i === values.length - 1 ? "end" : "middle"}>
            {demo.dates[i].slice(5)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

/* ── Control chart (I-MR individuals chart) for one unit ───────────────── */

function ControlChart({ unit }: { unit: Unit }) {
  const w = 640;
  const h = 220;
  const m = { l: 44, r: 12, t: 12, b: 26 };
  const pts = unit.peaks
    .map((v, i) => ({ v, i, date: demo.dates[i] }))
    .filter((p): p is { v: number; i: number; date: string } => p.v != null);
  const { center, ucl, lcl } = unit.limits;
  const vals = [...pts.map((p) => p.v), unit.rated, ucl ?? 0, lcl ?? 0].filter((v) => v > 0);
  const vmin = Math.min(...vals) * 0.9;
  const vmax = Math.max(...vals) * 1.05;
  const x = (i: number) => m.l + (i / (demo.dates.length - 1)) * (w - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - vmin) / (vmax - vmin)) * (h - m.t - m.b);
  const periodStart = demo.dates.indexOf(demo.period.start);
  const signalDates = new Set(unit.signals.map((s) => s.date));
  const line = pts.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const ticks = [vmin, (vmin + vmax) / 2, vmax].map((v) => Math.round(v));

  return (
    <svg className="tcm-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Daily peak control chart for ${unit.id}`}>
      <rect x={x(periodStart)} y={m.t} width={w - m.r - x(periodStart)} height={h - m.t - m.b} className="tcm-chart__period" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} className="tcm-chart__grid" />
          <text x={m.l - 6} y={y(t) + 4} className="tcm-chart__tick">
            {t}
          </text>
        </g>
      ))}
      {ucl != null && <line x1={m.l} x2={w - m.r} y1={y(ucl)} y2={y(ucl)} className="tcm-chart__limit" />}
      {lcl != null && <line x1={m.l} x2={w - m.r} y1={y(lcl)} y2={y(lcl)} className="tcm-chart__limit" />}
      {center != null && <line x1={m.l} x2={w - m.r} y1={y(center)} y2={y(center)} className="tcm-chart__center" />}
      <line x1={m.l} x2={w - m.r} y1={y(unit.rated)} y2={y(unit.rated)} className="tcm-chart__rating" />
      <text x={w - m.r} y={y(unit.rated) - 4} className="tcm-chart__label tcm-chart__label--rating">
        rating {unit.rated} kVA
      </text>
      {ucl != null && (
        <text x={m.l + 4} y={y(ucl) - 4} className="tcm-chart__label">
          UCL {fmt(ucl)}
        </text>
      )}
      <path d={line} className="tcm-chart__line" />
      {pts.map((p) => (
        <circle
          key={p.date}
          cx={x(p.i)}
          cy={y(p.v)}
          r={signalDates.has(p.date) ? 4.5 : 2.2}
          className={signalDates.has(p.date) ? "tcm-chart__pt tcm-chart__pt--signal" : "tcm-chart__pt"}
        >
          <title>
            {p.date}: {p.v} kVA
          </title>
        </circle>
      ))}
      <text x={m.l} y={h - 8} className="tcm-chart__tick tcm-chart__tick--x">
        {demo.dates[0]}
      </text>
      <text x={x(periodStart)} y={h - 8} className="tcm-chart__tick tcm-chart__tick--x">
        period →
      </text>
      <text x={w - m.r} y={h - 8} className="tcm-chart__tick tcm-chart__tick--end">
        {demo.dates[demo.dates.length - 1]}
      </text>
    </svg>
  );
}

/* ── Unit detail panel with the reviewer's decision form ────────────────── */

type Decision = { outcome: "approve" | "override" | "reject"; note: string; by: string };

function UnitDetail({ unit, decision, onDecide }: { unit: Unit; decision?: Decision; onDecide: (d: Decision) => void }) {
  const tier = TIER[unit.status];
  const [outcome, setOutcome] = useState<Decision["outcome"]>("approve");
  const [note, setNote] = useState("");
  const flagged = unit.status !== "within_limits";

  return (
    <div className="tcm-detail">
      <div className="memo__head">
        <div>
          <div className="kicker" style={{ color: tier.color }}>
            {tier.label} · rule {unit.rule}
          </div>
          <h3 className="memo__title">{unit.name}</h3>
          <div className="memo__meta">
            {unit.id} · {areaName(unit.area)} · {unit.rated} kVA · {unit.customers} customers
          </div>
        </div>
      </div>

      <p className="memo__summary tcm-detail__reason">{unit.reason}.</p>

      <ControlChart unit={unit} />

      <dl className="tcm-facts">
        <div>
          <dt>Period peak</dt>
          <dd>
            {fmt(unit.peak)} kVA <span className="tcm-facts__sub">{Math.round(unit.ratio * 100)}% of rating</span>
          </dd>
        </div>
        <div>
          <dt>Chart</dt>
          <dd>
            {unit.stability.replace("_", " ")}
            {unit.signals.length > 0 && (
              <span className="tcm-facts__sub">{[...new Set(unit.signals.map((s) => SIGNAL_LABEL[s.rule] ?? s.rule))].join(" · ")}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Headroom (Cpk)</dt>
          <dd>
            {unit.cpk == null ? (
              <>
                withheld <span className="tcm-facts__sub">chart assumptions not met</span>
              </>
            ) : (
              <>
                {fmt(unit.cpk, 2)}
                <span className="tcm-facts__sub">
                  95% CI {fmt(unit.cpkCi?.[0], 2)}–{fmt(unit.cpkCi?.[1], 2)}
                </span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Winter estimate</dt>
          <dd>
            {fmt(unit.projected)} kVA
            <span className="tcm-facts__sub">
              {unit.forecastRatio == null ? "" : `${Math.round(unit.forecastRatio * 100)}% of rating · `}estimate, {demo.forecast.horizon}
            </span>
          </dd>
        </div>
      </dl>

      {flagged && (
        <div className="tcm-decide">
          <div className="kicker">Reviewer decision</div>
          {decision ? (
            <p className="claim__ref">
              <strong>{decision.outcome}</strong> recorded by {decision.by}
              {decision.note ? ` — “${decision.note}”` : ""}. This unit leaves the review queue.
            </p>
          ) : (
            <form
              className="tcm-decide__form"
              onSubmit={(e) => {
                e.preventDefault();
                onDecide({ outcome, note: note.trim(), by: "you (demo)" });
                setNote("");
              }}
            >
              <div className="demo__chips" role="radiogroup" aria-label="Decision">
                {(["approve", "override", "reject"] as const).map((o) => (
                  <button key={o} type="button" role="radio" aria-checked={outcome === o} className={`demo-chip${outcome === o ? " is-active" : ""}`} onClick={() => setOutcome(o)}>
                    {o}
                  </button>
                ))}
              </div>
              <input className="tcm-decide__note" type="text" placeholder="Notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} />
              <button type="submit" className="demo-chip demo-chip--solid">
                Record decision
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

export function TransformerMonitorDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState<string | null>(null);
  const [show, setShow] = useState<Record<Status, boolean>>({ inspect_now: true, review_needed: true, within_limits: true });
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [queueFilter, setQueueFilter] = useState<"all" | Status>("all");
  const [view, setView] = useState<"map" | "dashboard" | "alerts" | "metrics">("map");
  const [acked, setAcked] = useState<Record<number, string>>({});
  // Each recorded decision with how long the reviewer had the unit open, for the metrics page.
  const [reviewLog, setReviewLog] = useState<{ outcome: Decision["outcome"]; seconds: number }[]>([]);
  const openedAt = useRef<number>(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, [selected]);
  const recordDecision = (id: string, d: Decision) => {
    setDecisions((v) => ({ ...v, [id]: d }));
    setReviewLog((l) => [...l, { outcome: d.outcome, seconds: (Date.now() - openedAt.current) / 1000 }]);
  };
  const openAlerts = demo.alerts.filter((a) => !acked[a.id]).length;

  const unit = demo.units.find((u) => u.id === selected) ?? null;
  const visible = demo.units.filter((u) => show[u.status] && (!focusArea || u.area === focusArea));
  // Draw green first so flagged dots sit on top.
  const drawn = [...visible].sort((a, b) => TIER[b.status].order - TIER[a.status].order);

  const queue = useMemo(
    () =>
      demo.units
        .filter((u) => u.status !== "within_limits" && !decisions[u.id])
        .filter((u) => queueFilter === "all" || u.status === queueFilter)
        .filter((u) => !focusArea || u.area === focusArea)
        .sort((a, b) => TIER[a.status].order - TIER[b.status].order || b.ratio - a.ratio),
    [decisions, queueFilter, focusArea],
  );
  const decided = Object.keys(decisions).length;

  // Zoom the map to a town when one is focused.
  const viewBox = useMemo(() => {
    if (!focusArea) return `0 0 ${W} ${H}`;
    const a = areaPaths.find((ar) => ar.id === focusArea)!;
    const pts = a.rings.flat(2);
    const xs = pts.map((p) => px(p[0]));
    const ys = pts.map((p) => py(p[1]));
    const x0 = Math.min(...xs) - 20;
    const y0 = Math.min(...ys) - 20;
    const bw = Math.max(...xs) - x0 + 20;
    const bh = Math.max(...ys) - y0 + 20;
    const s = Math.max(bw / W, bh / H);
    return `${x0 - (W * s - bw) / 2} ${y0 - (H * s - bh) / 2} ${W * s} ${H * s}`;
  }, [focusArea]);
  const zoom = focusArea ? Number(viewBox.split(" ")[2]) / W : 1;
  const sideRef = useRef<HTMLElement>(null);
  const tiles = useMemo(() => {
    const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
    return tilesFor(vx, vy, vw, vh);
  }, [viewBox]);

  return (
    <div className="demo tcm" aria-live="polite">
      <div className="demo__bar">
        <span className="demo__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="demo__title">capacity-monitor · period ending {demo.period.end}</span>
        <span className="demo__meta">{demo.summary.transformers} transformers</span>
      </div>

      <div className="demo__tabs" role="tablist" aria-label="Capacity monitor pages">
        {(
          [
            ["map", "Map"],
            ["dashboard", "Dashboard"],
            ["alerts", openAlerts ? `Alerts · ${openAlerts}` : "Alerts"],
            ["metrics", "Review metrics"],
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={view === key} className={`demo-tab${view === key ? " is-active" : ""}`} onClick={() => setView(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="demo__body">
        {view === "map" && (
        <>
        <div className="tcm-top">
          <div className="tcm-legend" role="group" aria-label="Tiers">
            {(Object.keys(TIER) as Status[]).map((s) => (
              <button key={s} type="button" className={`tcm-legend__item${show[s] ? "" : " is-off"}`} aria-pressed={show[s]} onClick={() => setShow((v) => ({ ...v, [s]: !v[s] }))}>
                <i style={{ background: TIER[s].color }} />
                {TIER[s].label} <b>{demo.summary[s]}</b>
              </button>
            ))}
          </div>
          <div>
            {focusArea ? (
              <button type="button" className="demo-chip demo-chip--ghost" onClick={() => setFocusArea(null)}>
                ← Whole county (now: {shortArea(focusArea)})
              </button>
            ) : (
              <span className="p2r__hint">Click a dot for its chart · double-click a town to focus it</span>
            )}
          </div>
        </div>

        <div className="tcm-layout">
          <div className="tcm-map-wrap">
            <svg className="tcm-map" viewBox={viewBox} role="img" aria-label="Map of Tompkins County transformers coloured by tier">
              <g className="tcm-tiles" aria-hidden="true">
                {tiles.map((t) => (
                  <image key={t.key} href={t.href} x={t.x} y={t.y} width={t.size} height={t.size} />
                ))}
              </g>
              {areaPaths.map((a) => (
                <path key={a.id} d={a.d} className={`tcm-area${focusArea === a.id ? " is-focus" : ""}`} onDoubleClick={() => setFocusArea(focusArea === a.id ? null : a.id)}>
                  <title>{a.name} · double-click to focus</title>
                </path>
              ))}
              {areaPaths.map((a) => (
                <text key={`${a.id}-l`} x={a.centroid[0]} y={a.centroid[1]} className="tcm-area__label" style={{ fontSize: 13 * zoom }}>
                  {shortArea(a.id)}
                </text>
              ))}
              {drawn.map((u) => (
                <circle
                  key={u.id}
                  cx={px(u.lon)}
                  cy={py(u.lat)}
                  r={(u.id === selected ? 7 : u.status === "within_limits" ? 3.2 : 4.6) * zoom}
                  fill={TIER[u.status].color}
                  className={`tcm-dot${u.id === selected ? " is-selected" : ""}${decisions[u.id] ? " is-decided" : ""}`}
                  onClick={() => { setSelected(u.id); sideRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }}
                >
                  <title>
                    {u.id} · {u.name} · {TIER[u.status].label}
                  </title>
                </circle>
              ))}
            </svg>
            <span className="tcm-attrib">
              Imagery: Esri, Maxar, Earthstar Geographics · ©{" "}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
            </span>
          </div>

          <aside className="tcm-side" ref={sideRef}>
            {unit ? (
              <>
                <button type="button" className="tcm-side__back" onClick={() => setSelected(null)}>
                  ← Review queue
                </button>
                <UnitDetail key={unit.id} unit={unit} decision={decisions[unit.id]} onDecide={(d) => recordDecision(unit.id, d)} />
              </>
            ) : (
              <>
                <div className="tcm-side__head">
                  <div>
                    <div className="kicker">Review queue</div>
                    <div className="memo__meta">
                      {queue.length} awaiting a decision · {decided} decided
                    </div>
                  </div>
                  <div className="demo__chips">
                    {(["all", "inspect_now", "review_needed"] as const).map((f) => (
                      <button key={f} type="button" className={`demo-chip demo-chip--sm${queueFilter === f ? " is-active" : ""}`} onClick={() => setQueueFilter(f)}>
                        {f === "all" ? "All" : TIER[f].label}
                      </button>
                    ))}
                  </div>
                </div>
                <ol className="tcm-queue">
                  {queue.slice(0, 40).map((u) => (
                    <li key={u.id}>
                      <button type="button" className="tcm-queue__item" onClick={() => { setSelected(u.id); sideRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }}>
                        <i style={{ background: TIER[u.status].color }} />
                        <span className="tcm-queue__name">
                          <span className="ranking__company">{u.name}</span>
                          <span className="ranking__sector">
                            {u.id} · {shortArea(u.area)} · rule {u.rule}
                          </span>
                        </span>
                        <span className="tcm-queue__ratio">{Math.round(u.ratio * 100)}%</span>
                      </button>
                    </li>
                  ))}
                  {queue.length > 40 && <li className="p2r__hint">…and {queue.length - 40} more</li>}
                  {queue.length === 0 && <li className="p2r__hint">Nothing waiting. Every flagged unit here has a recorded decision.</li>}
                </ol>
              </>
            )}
          </aside>
        </div>

        <details className="tcm-rules">
          <summary>Decision rules that fired this period · first matching row wins</summary>
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Tier</th>
                <th>Condition</th>
                <th>Reason shown to the reviewer</th>
                <th>Units</th>
              </tr>
            </thead>
            <tbody>
              {demo.rules.map((r) => (
                <tr key={r.rule}>
                  <td>{r.rule}</td>
                  <td>
                    <span className="tcm-tier" style={{ color: TIER[r.outcome].color }}>
                      {TIER[r.outcome].label}
                    </span>
                  </td>
                  <td>
                    <code>{r.condition}</code>
                  </td>
                  <td>{r.reason}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        </>
        )}

        {view === "dashboard" && (
          <div className="tcm-dash">
            <div className="tcm-dash__head">
              <div>
                <div className="kicker">Whole county</div>
                <div className="memo__meta">
                  Week ending {demo.period.period_id} · {demo.summary.flagged} need a person · report {demo.report.status}, rerun {demo.report.rerunCount} times
                </div>
              </div>
              {openAlerts > 0 && (
                <button type="button" className="demo-chip demo-chip--sm" onClick={() => setView("alerts")}>
                  Needs attention · {openAlerts} unacknowledged alert{openAlerts === 1 ? "" : "s"}
                </button>
              )}
            </div>

            <div className="tcm-pies">
              <Donut
                title="Review status"
                slices={DASH.status}
                onPick={(k) => {
                  setShow({ inspect_now: k === "inspect_now", review_needed: k === "review_needed", within_limits: k === "within_limits" });
                  setView("map");
                }}
              />
              <Donut title="Load pattern" slices={DASH.stability} />
              <Donut title="Peak against rating" slices={DASH.peak} />
            </div>

            <div className="kicker">Daily trends · whole county</div>
            <div className="tcm-trends">
              <Trend title="Near rating" sub="Daily share at or above 90% of rating (%)" values={DASH.daily.map((d) => d.near)} unit="%" />
              <Trend title="Transformers with signals" sub="Daily count · each transformer counted once" values={DASH.daily.map((d) => d.signals)} />
              <Trend title="Typical loading" sub="Median daily peak · band shows middle 50% · % of rating" values={DASH.daily.map((d) => d.median)} band={DASH.daily.map((d) => [d.q1, d.q3] as [number, number])} unit="%" />
            </div>

            <div className="kicker">By town</div>
            <table className="tcm-areas">
              <thead>
                <tr>
                  <th>Town</th>
                  <th>Units</th>
                  <th>Inspect</th>
                  <th>Review</th>
                  <th>Within</th>
                  <th>Highest peak</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {DASH.areas.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.units}</td>
                    <td style={{ color: a.inspect_now ? TIER.inspect_now.color : undefined }}>{a.inspect_now}</td>
                    <td style={{ color: a.review_needed ? TIER.review_needed.color : undefined }}>{a.review_needed}</td>
                    <td>{a.within_limits}</td>
                    <td>{Math.round(a.maxRatio * 100)}%</td>
                    <td>
                      <button
                        type="button"
                        className="tcm-areas__go"
                        onClick={() => {
                          setFocusArea(a.id);
                          setView("map");
                        }}
                      >
                        Map →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "alerts" && (
          <div className="tcm-alerts">
            <div className="tcm-dash__head">
              <div>
                <div className="kicker">Alerts</div>
                <div className="memo__meta">
                  {openAlerts === 0 ? "Nothing needs a look right now." : `${openAlerts} alert${openAlerts === 1 ? " needs" : "s need"} a look.`} Each one says what happened and what to do; the technical text is tucked underneath.
                </div>
              </div>
              <div className="demo__chips">
                <span className="demo-chip demo-chip--sm is-active">Open {openAlerts}</span>
                <span className="demo-chip demo-chip--sm">Acknowledged {demo.alerts.length - openAlerts}</span>
              </div>
            </div>
            {demo.alerts.map((a) => (
              <article key={a.id} className={`tcm-alert${acked[a.id] ? " is-acked" : ""}`}>
                <div className="tcm-alert__when">
                  <div>
                    {a.createdAt.slice(0, 10)}
                    <span>{a.createdAt.slice(11, 16)}</span>
                  </div>
                  <b className={`tcm-alert__level tcm-alert__level--${a.level}`}>{a.level === "error" ? "Run stopped" : "Needs attention"}</b>
                  <small>
                    Week ending {a.periodId}
                    <br />
                    Stopped at step {a.step} of {demo.report.steps} · {a.stepName}
                  </small>
                </div>
                <div className="tcm-alert__body">
                  <h4>{a.title}</h4>
                  <dl>
                    <dt>What happened</dt>
                    <dd>{a.meaning}</dd>
                    <dt>What to do</dt>
                    <dd>{a.action}</dd>
                  </dl>
                  <details>
                    <summary>Technical details</summary>
                    <code>{a.details}</code>
                  </details>
                </div>
                <div className="tcm-alert__ack">
                  {acked[a.id] ? (
                    <>
                      <span className="tcm-alert__done">✓ Acknowledged</span>
                      <small>by you · {acked[a.id]}</small>
                    </>
                  ) : (
                    <>
                      <button type="button" className="demo-chip demo-chip--sm" onClick={() => setAcked((v) => ({ ...v, [a.id]: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }))}>
                        Acknowledge
                      </button>
                      <small>Marks it read for everyone. It stays in the list.</small>
                    </>
                  )}
                  <small className="tcm-alert__via">{a.delivered}</small>
                </div>
              </article>
            ))}
            <p className="p2r__hint">Alerts are written by the tool from fixed rules when a run stops or an input looks wrong. Acknowledging does not change any equipment or rerun anything.</p>
          </div>
        )}

        {view === "metrics" && (() => {
          const n = reviewLog.length;
          const overrides = reviewLog.filter((r) => r.outcome !== "approve").length;
          const secs = reviewLog.map((r) => r.seconds);
          const fast = secs.filter((x) => x < 20).length;
          return (
            <div className="tcm-metrics">
              <div className="kicker">Review metrics</div>
              <p className="memo__summary">Overrides near zero, or reviews that take seconds, mean the review has become a rubber stamp. Seeded known-wrong cases measure whether reviewers catch errors.</p>
              <dl className="tcm-facts tcm-facts--metrics">
                <div>
                  <dt>Dispositions recorded</dt>
                  <dd>
                    {n} <span className="tcm-facts__sub">of {demo.report.exceptionsTotal} exceptions this period</span>
                  </dd>
                </div>
                <div>
                  <dt>Override rate</dt>
                  <dd>
                    {n ? `${Math.round((100 * overrides) / n)}%` : "—"} <span className="tcm-facts__sub">of cases were Override or Reject</span>
                  </dd>
                </div>
                <div>
                  <dt>Time per review</dt>
                  <dd>
                    {n ? `median ${Math.round(median(secs))} s` : "—"}
                    <span className="tcm-facts__sub">
                      {n ? `mean ${Math.round(secs.reduce((s, x) => s + x, 0) / n)} s · ${fast} under 20 s` : "measured from opening a unit to recording the decision"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Known-wrong calibration cases</dt>
                  <dd>
                    0 caught of {demo.report.calibrationCasesInQueue} seen <span className="tcm-facts__sub">none seeded in this period's queue</span>
                  </dd>
                </div>
              </dl>
              {n === 0 ? (
                <p className="p2r__hint">
                  No decisions yet. Open a flagged unit on the{" "}
                  <button type="button" className="tcm-link" onClick={() => setView("map")}>
                    Map
                  </button>{" "}
                  and record one; the figures here update as you go.
                </p>
              ) : (
                <ol className="tcm-queue tcm-queue--log">
                  {reviewLog.map((r, i) => (
                    <li key={i} className="tcm-queue__item tcm-queue__item--static">
                      <span className="tcm-queue__name">
                        <span className="ranking__company">{r.outcome === "approve" ? "Approved" : r.outcome === "override" ? "Override" : "Rejected"}</span>
                      </span>
                      <span className="tcm-queue__ratio">{Math.round(r.seconds)} s</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

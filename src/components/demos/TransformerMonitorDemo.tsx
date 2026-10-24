"use client";

import { useMemo, useState } from "react";
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

const W = 1000;
const H = 760;
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
        href: `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${ty}/${tx}`,
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

      <div className="demo__body">
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
                  onClick={() => setSelected(u.id)}
                >
                  <title>
                    {u.id} · {u.name} · {TIER[u.status].label}
                  </title>
                </circle>
              ))}
            </svg>
            <span className="tcm-attrib">
              Basemap: Esri, HERE, Garmin · ©{" "}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
            </span>
          </div>

          <aside className="tcm-side">
            {unit ? (
              <>
                <button type="button" className="tcm-side__back" onClick={() => setSelected(null)}>
                  ← Review queue
                </button>
                <UnitDetail key={unit.id} unit={unit} decision={decisions[unit.id]} onDecide={(d) => setDecisions((v) => ({ ...v, [unit.id]: d }))} />
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
                      <button type="button" className="tcm-queue__item" onClick={() => setSelected(u.id)}>
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
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import data from "@/data/lead-generator-demo.json";

type Rec = { text: string; confidence: number; source: string };
type Flag = { law: string; status: string; note: string; confidence: number; source: string };
type Breakdown = { category: string; savingsPct: number; annualSavings: number; methodology: string; investmentRequired: number; paybackMonths: number };
type Run = {
  id: number;
  label: string;
  createdAt: string;
  prospect: { companyName: string; contactName: string; state: string; buildingType: string; sqft: number; monthlySpend: number; locations: number; goals: string[]; buildingDetails: Record<string, string | string[]> };
  bill: Record<string, string>;
  headline: { savingsPct: number; annualSavings: number; paybackMonths: number };
  usageReduction: Rec[];
  procurement: Rec[];
  alternativeGeneration: Rec[];
  complianceFlags: Flag[];
  financialAnalysis: {
    baseline: { monthlySpend: number; annualSpend: number; costPerSqft: number; costPerLocation: number };
    savingsBreakdown: Breakdown[];
    totalSavingsPct: number;
    totalAnnualSavings: number;
    totalInvestment: number;
    blendedPaybackMonths: number;
    fiveYearProjection: { year: number; cumulativeSavings: number; netOfInvestment: number }[];
  };
  email: { subject: string; body: string };
};
type StateNote = {
  name: string;
  avgCommercialRate: number;
  netMetering: string;
  rps: string;
  solarIncentives: string[];
  demandResponse: string[];
  keyPrograms: string[];
  complianceNotes: string;
  utilities: string[];
};

const demo = data as unknown as {
  runs: Run[];
  eia: { rates: Record<string, number>; nationalAvg: number; source: string };
  nrel: { states: Record<string, { kwhPerKwp: number; costPerW: number; tier: string }>; source: string };
  stateNotes: Record<string, StateNote>;
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// Same labels the real app's status panel uses, in the pipeline's four phases.
const AGENTS = [
  { key: "research", label: "Market Research & Data Gathering", phase: 1 },
  { key: "usage", label: "Usage Reduction Analysis", phase: 2 },
  { key: "procurement", label: "Procurement Strategy", phase: 2 },
  { key: "generation", label: "Alternative Generation Evaluation", phase: 2 },
  { key: "compliance", label: "Compliance Check", phase: 2 },
  { key: "financial", label: "Financial Analysis & Modeling", phase: 3 },
  { key: "email", label: "Email Drafting", phase: 4 },
] as const;
// Start/finish offsets (ms): research first, four specialists in parallel, then financial, then email.
const START = [0, 1500, 1500, 1500, 1500, 4300, 5600];
const DONE = [1400, 3600, 4100, 3800, 3300, 5400, 6500];

const money = (n: number, d = 0) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d });
const tier = (c: number) => (c >= 0.7 ? "high" : c >= 0.5 ? "mid" : "low");

function Confidence({ value }: { value: number }) {
  return <span className={`demo-conf demo-conf--${tier(value)}`}>{Math.round(value * 100)}% conf</span>;
}

function useReplay() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  return {
    clear: () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    schedule: (ms: number, fn: () => void) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) fn();
      else timers.current.push(window.setTimeout(fn, ms));
    },
  };
}

/* ── Ported from server/data: the deterministic grounding the agents receive ── */

function stateRate(code: string) {
  const rate = demo.eia.rates[code] ?? demo.eia.nationalAvg;
  const diff = (((rate - demo.eia.nationalAvg) / demo.eia.nationalAvg) * 100).toFixed(1);
  const dir = rate > demo.eia.nationalAvg ? "above" : "below";
  return { rate, vsNational: `${Math.abs(Number(diff))}% ${dir} national average of ${demo.eia.nationalAvg}¢/kWh` };
}

function solarData(code: string, sqft: number, rateCents: number) {
  const d = demo.nrel.states[code] ?? { kwhPerKwp: 1350, costPerW: 1.85, tier: "moderate" };
  const usableRoofSqft = Math.round(sqft * 0.17);
  const kwp = Math.min(Math.round((usableRoofSqft * 10) / 1000), 2000);
  const production = Math.round(kwp * d.kwhPerKwp);
  const savings = Math.round(production * (rateCents / 100));
  const cost = Math.round(kwp * 1000 * d.costPerW);
  const afterItc = Math.round(cost * 0.7);
  const payback = afterItc > 0 && savings > 0 ? Number((afterItc / savings).toFixed(1)) : null;
  return { ...d, usableRoofSqft, kwp, production, savings, cost, afterItc, payback };
}

/* ── Tab 1: generate a proposal ─────────────────────────────────────────── */

type Status = "idle" | "running" | "done";

function ProposalTab() {
  const replay = useReplay();
  const [run, setRun] = useState<Run | null>(null);
  const [status, setStatus] = useState<Status[]>(Array(AGENTS.length).fill("idle"));
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<"financial" | "recs" | "compliance" | "email">("financial");
  const busy = !!run && !ready;

  const start = (next: Run) => {
    replay.clear();
    setRun(next);
    setReady(false);
    setSection("financial");
    setStatus(Array(AGENTS.length).fill("idle"));
    AGENTS.forEach((_, i) => {
      replay.schedule(START[i], () => setStatus((s) => s.map((v, j) => (j === i ? "running" : v))));
      replay.schedule(DONE[i], () => setStatus((s) => s.map((v, j) => (j === i ? "done" : v))));
    });
    replay.schedule(Math.max(...DONE) + 300, () => setReady(true));
  };

  const fa = run?.financialAnalysis;
  const maxCum = fa ? Math.max(...fa.fiveYearProjection.map((p) => p.cumulativeSavings)) : 1;

  return (
    <>
      <div className="demo__prompt">
        <span className="demo__caret" aria-hidden="true">
          ›
        </span>
        <span>{run ? `Generate proposal · ${run.prospect.companyName} · ${run.prospect.buildingType}, ${STATE_NAMES[run.prospect.state]}` : "Pick a saved prospect to generate its proposal"}</span>
      </div>

      <div className="demo__chips" role="group" aria-label="Prospects">
        {demo.runs.map((r) => (
          <button key={r.id} type="button" className={`demo-chip${run?.id === r.id ? " is-active" : ""}`} onClick={() => start(r)} disabled={busy}>
            {r.label} <span className="demo-chip__ticker">{r.prospect.state} · {r.prospect.buildingType}</span>
          </button>
        ))}
      </div>

      {run && (
        <div className="lg-intake">
          {Object.keys(run.bill).length > 0 && (
            <div className="lg-bill">
              <div className="kicker">Bill extracted · GPT-4o vision</div>
              <dl className="lg-bill__grid">
                {Object.entries(run.bill).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div className="lg-prospect">
            <div className="kicker">Prospect</div>
            <div className="demo__chips">
              <span className="demo-pick">{run.prospect.sqft.toLocaleString()} sq ft</span>
              <span className="demo-pick">{money(run.prospect.monthlySpend)}/mo</span>
              <span className="demo-pick">
                {run.prospect.locations} location{run.prospect.locations > 1 ? "s" : ""}
              </span>
              {run.prospect.goals.map((g) => (
                <span key={g} className="demo-pick demo-pick--top">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {run && (
        <ol className="demo-agents">
          {AGENTS.map((a, i) => (
            <li key={a.key} className={`demo-agent demo-agent--${status[i]}${a.phase === 2 ? " lg-agent--parallel" : ""}`}>
              <span className="demo-agent__state" aria-hidden="true" />
              <span className="demo-agent__name">
                <span className="lg-phase">P{a.phase}</span> {a.label}
              </span>
              <span className="demo-agent__result">
                {status[i] === "done" ? "complete" : status[i] === "running" ? (a.phase === 2 ? "running in parallel…" : "running…") : "queued"}
              </span>
            </li>
          ))}
        </ol>
      )}

      {run && ready && fa && (
        <div className="memo lg-proposal">
          <div className="memo__head">
            <div>
              <div className="kicker">Proposal ready</div>
              <h3 className="memo__title">{run.prospect.companyName}</h3>
              <div className="memo__meta">
                Generated {run.createdAt} · {run.prospect.buildingType} · {run.prospect.sqft.toLocaleString()} sq ft · {STATE_NAMES[run.prospect.state]}
              </div>
            </div>
          </div>

          <div className="kpis lg-kpis">
            <div className="kpi kpi--dark">
              <span className="kpi__n">{money(fa.totalAnnualSavings)}</span>
              <span className="kpi__l">estimated annual savings</span>
            </div>
            <div className="kpi">
              <span className="kpi__n">{Math.round(fa.totalSavingsPct)}%</span>
              <span className="kpi__l">savings potential</span>
            </div>
            <div className="kpi">
              <span className="kpi__n">{fa.blendedPaybackMonths.toFixed(2)} mo</span>
              <span className="kpi__l">blended payback</span>
            </div>
          </div>

          <div className="demo__tabs lg-subtabs" role="tablist" aria-label="Proposal sections">
            {(
              [
                ["financial", "Financial analysis"],
                ["recs", "Recommendations"],
                ["compliance", `Compliance (${run.complianceFlags.length})`],
                ["email", "Client email"],
              ] as const
            ).map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={section === key} className={`demo-tab${section === key ? " is-active" : ""}`} onClick={() => setSection(key)}>
                {label}
              </button>
            ))}
          </div>

          {section === "financial" && (
            <div className="lg-fin">
              <div className="kpis">
                <div className="kpi">
                  <span className="kpi__n">{money(fa.baseline.annualSpend)}</span>
                  <span className="kpi__l">annual energy spend · {money(fa.baseline.monthlySpend)}/mo baseline</span>
                </div>
                <div className="kpi">
                  <span className="kpi__n">{money(fa.baseline.costPerSqft, 2)}</span>
                  <span className="kpi__l">cost per sq ft</span>
                </div>
                <div className="kpi">
                  <span className="kpi__n">{money(fa.totalInvestment)}</span>
                  <span className="kpi__l">total investment required</span>
                </div>
              </div>

              <div className="kicker">Savings breakdown</div>
              <ol className="lg-breakdown">
                {fa.savingsBreakdown.map((b) => (
                  <li key={b.category} className="lg-break">
                    <div className="lg-break__head">
                      <span className="lg-break__cat">{b.category}</span>
                      <span className="lg-break__amt">
                        {money(b.annualSavings)}
                        <span className="tcm-facts__sub">/yr · {b.savingsPct.toFixed(1)}% of spend</span>
                      </span>
                    </div>
                    <span className="holding__bar" aria-hidden="true">
                      <i style={{ width: `${(b.annualSavings / fa.totalAnnualSavings) * 100}%` }} />
                    </span>
                    <p className="lg-break__why">{b.methodology}</p>
                    <div className="lg-break__meta">
                      Investment {money(b.investmentRequired)} · payback {b.paybackMonths > 0 ? `${b.paybackMonths.toFixed(1)} months` : "immediate"}
                    </div>
                  </li>
                ))}
              </ol>

              <div className="kicker">Five-year projection</div>
              <div className="lg-proj">
                {fa.fiveYearProjection.map((p) => (
                  <div key={p.year} className="lg-proj__col">
                    <div className="lg-proj__bars" aria-hidden="true">
                      <i className="lg-proj__cum" style={{ height: `${(p.cumulativeSavings / maxCum) * 100}%` }} />
                      <i className={`lg-proj__net${p.netOfInvestment < 0 ? " is-neg" : ""}`} style={{ height: `${(Math.abs(p.netOfInvestment) / maxCum) * 100}%` }} />
                    </div>
                    <span className="lg-proj__year">Y{p.year}</span>
                    <span className="lg-proj__val">{money(p.netOfInvestment)}</span>
                  </div>
                ))}
                <div className="lg-proj__legend">
                  <span>
                    <i className="lg-proj__cum" /> cumulative savings
                  </span>
                  <span>
                    <i className="lg-proj__net" /> net position after investment
                  </span>
                </div>
              </div>
            </div>
          )}

          {section === "recs" && (
            <div className="lg-recs">
              {(
                [
                  ["Usage reduction", run.usageReduction],
                  ["Procurement strategy", run.procurement],
                  ["Alternative generation", run.alternativeGeneration],
                ] as const
              ).map(([title, items]) => (
                <div key={title}>
                  <div className="kicker">{title}</div>
                  <ul className="memo-claims">
                    {items.map((r) => (
                      <li key={r.text.slice(0, 60)}>
                        <span>{r.text}</span>
                        <span className="memo-claim__meta">
                          <Confidence value={r.confidence} />
                          <span className="demo-src" title={r.source}>
                            {r.source.length > 48 ? `${r.source.slice(0, 48)}…` : r.source}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {section === "compliance" && (
            <ul className="lg-flags">
              {run.complianceFlags.map((f) => (
                <li key={f.law} className="lg-flag">
                  <div className="lg-flag__head">
                    <span className={`demo-rating demo-rating--${f.status.includes("action") ? "sell" : f.status === "monitor" ? "hold" : "buy"}`}>{f.status}</span>
                    <span className="ranking__company">{f.law}</span>
                  </div>
                  <p className="claim__ref">{f.note}</p>
                  <span className="memo-claim__meta">
                    <Confidence value={f.confidence} />
                    <span className="demo-src" title={f.source}>
                      {f.source.length > 48 ? `${f.source.slice(0, 48)}…` : f.source}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {section === "email" && (
            <div className="lg-mail">
              <div className="lg-mail__row">
                <span className="lg-mail__k">To</span>
                <span>{run.prospect.contactName}, {run.prospect.companyName}</span>
              </div>
              <div className="lg-mail__row">
                <span className="lg-mail__k">Subject</span>
                <span>{run.email.subject}</span>
              </div>
              <pre className="lg-mail__body">{run.email.body}</pre>
              <p className="p2r__hint">In the real tool this is sent through SMTP from the review screen. Sending is disabled here.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ── Tab 2: grounding data by state ─────────────────────────────────────── */

function GroundingTab() {
  const [code, setCode] = useState("TX");
  const [sqft, setSqft] = useState(50000);
  const [rate, setRate] = useState<number | null>(null); // null = use the state's EIA rate
  const eia = stateRate(code);
  const usedRate = rate ?? eia.rate;
  const solar = useMemo(() => solarData(code, sqft, usedRate), [code, sqft, usedRate]);
  const notes = demo.stateNotes[code];

  return (
    <>
      <div className="demo__prompt">
        <span className="demo__caret" aria-hidden="true">
          ›
        </span>
        <span>What the research agent is given for a prospect in {STATE_NAMES[code]}</span>
      </div>

      <div className="builder">
        <label className="builder__field">
          <span>State</span>
          <select
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setRate(null);
            }}
          >
            {Object.keys(STATE_NAMES).map((s) => (
              <option key={s} value={s}>
                {STATE_NAMES[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="builder__field">
          <span>Building · {sqft.toLocaleString()} sq ft</span>
          <input type="range" min={5000} max={500000} step={5000} value={sqft} onChange={(e) => setSqft(Number(e.target.value))} />
        </label>
        <label className="builder__field">
          <span>Electricity rate · {usedRate.toFixed(2)}¢/kWh{rate == null ? " (EIA)" : ""}</span>
          <input type="range" min={5} max={40} step={0.25} value={usedRate} onChange={(e) => setRate(Number(e.target.value))} />
        </label>
      </div>

      <div className="memo__cols">
        <div className="memo">
          <div className="kicker">EIA commercial rate</div>
          <div className="kpi__n">{eia.rate.toFixed(2)}¢/kWh</div>
          <p className="claim__ref">{eia.vsNational}.</p>
          <p className="p2r__hint">{demo.eia.source}</p>
        </div>
        <div className="memo">
          <div className="kicker">Rooftop solar estimate · {solar.tier} resource</div>
          <dl className="tcm-facts">
            <div>
              <dt>Installable</dt>
              <dd>
                {solar.kwp} kWp <span className="tcm-facts__sub">{solar.usableRoofSqft.toLocaleString()} sq ft usable roof</span>
              </dd>
            </div>
            <div>
              <dt>Production</dt>
              <dd>
                {solar.production.toLocaleString()} kWh/yr <span className="tcm-facts__sub">{solar.kwhPerKwp} kWh per kWp</span>
              </dd>
            </div>
            <div>
              <dt>Savings</dt>
              <dd>
                {money(solar.savings)}/yr <span className="tcm-facts__sub">at {usedRate.toFixed(2)}¢/kWh</span>
              </dd>
            </div>
            <div>
              <dt>Payback</dt>
              <dd>
                {solar.payback ?? "—"} yrs <span className="tcm-facts__sub">{money(solar.afterItc)} after 30% ITC ({money(solar.cost)} before)</span>
              </dd>
            </div>
          </dl>
          <p className="p2r__hint">{demo.nrel.source}</p>
        </div>
      </div>

      {notes ? (
        <div className="memo">
          <div className="kicker">State notes the agents also receive</div>
          <dl className="lg-notes">
            <div>
              <dt>Net metering</dt>
              <dd>{notes.netMetering}</dd>
            </div>
            <div>
              <dt>Renewable standard</dt>
              <dd>{notes.rps}</dd>
            </div>
            <div>
              <dt>Solar incentives</dt>
              <dd>
                <ul>
                  {notes.solarIncentives.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Demand response</dt>
              <dd>
                <ul>
                  {notes.demandResponse.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Compliance</dt>
              <dd>{notes.complianceNotes}</dd>
            </div>
            <div>
              <dt>Utilities</dt>
              <dd>{notes.utilities.join(" · ")}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="p2r__hint">Detailed state notes exist for {Object.keys(demo.stateNotes).length} states; for the rest the agents work from the EIA and NREL figures above.</p>
      )}
    </>
  );
}

/* ── Shell ──────────────────────────────────────────────────────────────── */

const TABS = [
  { key: "proposal", label: "Generate a proposal", meta: "7 agents · 4 phases" },
  { key: "grounding", label: "Grounding data", meta: "EIA · NREL · live" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function LeadGeneratorDemo() {
  const [tab, setTab] = useState<TabKey>("proposal");
  const active = TABS.find((t) => t.key === tab)!;
  return (
    <div className="demo" aria-live="polite">
      <div className="demo__bar">
        <span className="demo__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="demo__title">proposal-engine · {tab}</span>
        <span className="demo__meta">{active.meta}</span>
      </div>
      <div className="demo__tabs" role="tablist" aria-label="Proposal engine features">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`demo-tab${tab === t.key ? " is-active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="demo__body" role="tabpanel">
        {tab === "proposal" && <ProposalTab />}
        {tab === "grounding" && <GroundingTab />}
      </div>
    </div>
  );
}

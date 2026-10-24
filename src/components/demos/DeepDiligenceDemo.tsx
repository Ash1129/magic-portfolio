"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import data from "@/data/deepdiligence-demo.json";

type Claim = { text: string; confidence: number; sources: string[] };
type Section = { title: string; content: string; confidence: number; claims: Claim[]; conflicts: string[] };
type AgentRun = { key: string; findings: number; confidence: number; summary: string; sample: string[] };
type Run = {
  ticker: string;
  company: string;
  generatedAt: string;
  overallConfidence: number;
  executiveSummary: string;
  highlights: string[];
  risks: string[];
  totals: { findings: number | null; sources: number | null };
  agents: AgentRun[];
  sections: Section[];
  sources: Record<string, { title: string; url: string; type: string }>;
};
type Rating = {
  rank: number;
  ticker: string;
  company: string;
  sector: string;
  rating: string;
  weight: number;
  confidence: number;
  bull: string;
  bear: string;
  rationale: string;
};
type Weekly = {
  week: string;
  generatedAt: string;
  model: string;
  ratings: Rating[];
  topPicks: string[];
  avoid: string[];
  macro: string;
  sectorViews: Record<string, string>;
};

// The JSON is produced by the extractor from the real memos and reports, so its shape is known.
const { runs, weekly } = data as unknown as { runs: Run[]; weekly: Weekly[] };

// Same labels the real DeepDiligence UI uses.
const AGENT_LABELS: Record<string, string> = {
  financial_analyst: "Financial Analyst",
  team_culture: "Team & Culture",
  market_competitive: "Market & Competitive",
  risk_sentiment: "Risk & Sentiment",
  quantitative_momentum: "Quant Momentum",
};

function tier(confidence: number): "high" | "mid" | "low" {
  return confidence >= 0.7 ? "high" : confidence >= 0.5 ? "mid" : "low";
}

function Confidence({ value }: { value: number }) {
  return <span className={`demo-conf demo-conf--${tier(value)}`}>{Math.round(value * 100)}% conf</span>;
}

function RatingBadge({ rating }: { rating: string }) {
  return <span className={`demo-rating demo-rating--${rating.toLowerCase().replace(" ", "-")}`}>{rating}</span>;
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

/* ── Tab 1: single-company analysis ─────────────────────────────────────── */

// Agents start staggered and finish at different times, like the real parallel run.
const START_AT = [0, 180, 360, 540, 720];
const DONE_AT = [2300, 3100, 2700, 3500, 1900];
const SYNTHESIS_MS = 1600;
type Status = "idle" | "running" | "done";
type Stage = "pick" | "agents" | "synthesis" | "memo";

function AnalyseTab() {
  const replay = useReplay();
  const [run, setRun] = useState<Run | null>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [status, setStatus] = useState<Status[]>(Array(5).fill("idle"));
  const [open, setOpen] = useState<number | null>(0);
  const memoRef = useRef<HTMLDivElement>(null);
  const busy = stage === "agents" || stage === "synthesis";

  const start = (next: Run) => {
    replay.clear();
    setRun(next);
    setOpen(0);
    setStage("agents");
    setStatus(Array(5).fill("idle"));
    next.agents.forEach((_, i) => {
      replay.schedule(START_AT[i], () => setStatus((s) => s.map((v, j) => (j === i ? "running" : v))));
      replay.schedule(DONE_AT[i], () => setStatus((s) => s.map((v, j) => (j === i ? "done" : v))));
    });
    const allDone = Math.max(...DONE_AT) + 200;
    replay.schedule(allDone, () => setStage("synthesis"));
    replay.schedule(allDone + SYNTHESIS_MS, () => {
      setStage("memo");
      memoRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };

  const reset = () => {
    replay.clear();
    setRun(null);
    setStage("pick");
    setStatus(Array(5).fill("idle"));
  };

  const sourceLabel = (id: string) => id.replace(/^src_/, "Source ").replace(/_/g, " ");

  return (
    <>
      <div className="demo__prompt">
        <span className="demo__caret" aria-hidden="true">
          ›
        </span>
        <span>{run ? `Analyse ${run.company} (${run.ticker})` : "Pick a company to analyse"}</span>
      </div>

      <div className="demo__chips" role="group" aria-label="Companies">
        {runs.map((r) => (
          <button
            key={r.ticker}
            type="button"
            className={`demo-chip${run?.ticker === r.ticker ? " is-active" : ""}`}
            onClick={() => start(r)}
            disabled={busy}
          >
            {r.company} <span className="demo-chip__ticker">{r.ticker}</span>
          </button>
        ))}
        {run && stage === "memo" && (
          <button type="button" className="demo-chip demo-chip--ghost" onClick={reset}>
            Clear
          </button>
        )}
      </div>

      {run && (
        <ol className="demo-agents">
          {run.agents.map((agent, i) => (
            <li key={agent.key} className={`demo-agent demo-agent--${status[i]}`}>
              <span className="demo-agent__state" aria-hidden="true" />
              <span className="demo-agent__name">{AGENT_LABELS[agent.key]}</span>
              <span className="demo-agent__result">
                {status[i] === "done" ? (
                  <>
                    <span>{agent.findings} findings</span>
                    <Confidence value={agent.confidence} />
                  </>
                ) : status[i] === "running" ? (
                  "gathering sources…"
                ) : (
                  "queued"
                )}
              </span>
            </li>
          ))}
          <li
            className={`demo-agent demo-agent--synthesis demo-agent--${
              stage === "memo" ? "done" : stage === "synthesis" ? "running" : "idle"
            }`}
          >
            <span className="demo-agent__state" aria-hidden="true" />
            <span className="demo-agent__name">Synthesis Agent</span>
            <span className="demo-agent__result">
              {stage === "memo"
                ? `memo · ${run.sections.length} sections`
                : stage === "synthesis"
                  ? "reconciling 5 sub-reports, detecting conflicts…"
                  : "waiting for all five"}
            </span>
          </li>
        </ol>
      )}

      {run && stage === "memo" && (
        <div ref={memoRef} className="memo">
          <div className="memo__head">
            <div>
              <div className="kicker">Investment memo</div>
              <h3 className="memo__title">{run.company}</h3>
              <div className="memo__meta">
                Generated {run.generatedAt} · {run.totals.findings} findings · {run.totals.sources} sources
              </div>
            </div>
            <div className="memo__overall">
              <span className="memo__overall-label">Overall</span>
              <Confidence value={run.overallConfidence} />
            </div>
          </div>

          <p className="memo__summary">{run.executiveSummary}</p>

          <div className="memo__cols">
            <div>
              <div className="kicker">Highlights</div>
              <ul className="memo__list">
                {run.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="kicker">Risks</div>
              <ul className="memo__list memo__list--risk">
                {run.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          <ol className="memo__sections">
            {run.sections.map((section, i) => {
              const expanded = open === i;
              return (
                <li key={section.title} className="memo-section">
                  <button
                    type="button"
                    className="memo-section__head"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : i)}
                  >
                    <span className="memo-section__n">{String(i + 1).padStart(2, "0")}</span>
                    <span className="memo-section__title">{section.title}</span>
                    <span className="memo-section__right">
                      {section.conflicts.length > 0 && (
                        <span className="demo-flag">
                          {section.conflicts.length} conflict{section.conflicts.length > 1 ? "s" : ""}
                        </span>
                      )}
                      <Confidence value={section.confidence} />
                      <span className="memo-section__chev" aria-hidden="true">
                        {expanded ? "–" : "+"}
                      </span>
                    </span>
                  </button>
                  {expanded && (
                    <div className="memo-section__body">
                      {section.content.split(/\n\n+/).map((p) => (
                        <p key={p.slice(0, 40)}>{p}</p>
                      ))}
                      <div className="kicker">Claims</div>
                      <ul className="memo-claims">
                        {section.claims.map((claim) => (
                          <li key={claim.text}>
                            <span>{claim.text}</span>
                            <span className="memo-claim__meta">
                              <Confidence value={claim.confidence} />
                              {claim.sources.map((id) => {
                                const src = run.sources[id];
                                const label = sourceLabel(id);
                                return src?.url ? (
                                  <a
                                    key={id}
                                    className="demo-src"
                                    href={src.url}
                                    title={src.title}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {label}
                                  </a>
                                ) : (
                                  <span key={id} className="demo-src" title={src?.title}>
                                    {label}
                                  </span>
                                );
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {section.conflicts.length > 0 && (
                        <div className="memo-conflicts">
                          <div className="kicker">Conflicts detected</div>
                          <ul>
                            {section.conflicts.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </>
  );
}

/* ── Tab 2: weekly rankings ─────────────────────────────────────────────── */

const STOCK_STEP_MS = 420;
const RANKING_MS = 1500;

function WeeklyTab() {
  const replay = useReplay();
  const [report, setReport] = useState<Weekly | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [phase, setPhase] = useState<"pick" | "pipeline" | "ranking" | "report">("pick");
  const [open, setOpen] = useState<string | null>(null);
  const busy = phase === "pipeline" || phase === "ranking";

  const start = (next: Weekly) => {
    replay.clear();
    setReport(next);
    setDoneCount(0);
    setOpen(null);
    setPhase("pipeline");
    next.ratings.forEach((_, i) => replay.schedule(STOCK_STEP_MS * (i + 1), () => setDoneCount(i + 1)));
    const pipelineDone = STOCK_STEP_MS * (next.ratings.length + 1);
    replay.schedule(pipelineDone, () => setPhase("ranking"));
    replay.schedule(pipelineDone + RANKING_MS, () => setPhase("report"));
  };

  // The universe is listed in the report's rank order; during the replay show it alphabetically,
  // as the batch runner would, so the ranking is a reveal.
  const universe = useMemo(
    () => (report ? [...report.ratings].sort((a, b) => a.company.localeCompare(b.company)) : []),
    [report],
  );

  return (
    <>
      <div className="demo__prompt">
        <span className="demo__caret" aria-hidden="true">
          ›
        </span>
        <span>{report ? `Generate weekly report · ${report.week}` : "Pick a week to generate its rankings"}</span>
      </div>

      <div className="demo__chips" role="group" aria-label="Weeks">
        {weekly.map((w) => (
          <button
            key={w.week}
            type="button"
            className={`demo-chip${report?.week === w.week ? " is-active" : ""}`}
            onClick={() => start(w)}
            disabled={busy}
          >
            {w.week} <span className="demo-chip__ticker">{w.ratings.length} stocks</span>
          </button>
        ))}
      </div>

      {report && phase !== "report" && (
        <ol className="demo-agents">
          {universe.map((r, i) => {
            const state = i < doneCount ? "done" : i === doneCount && phase === "pipeline" ? "running" : "idle";
            return (
              <li key={r.ticker} className={`demo-agent demo-agent--${state}`}>
                <span className="demo-agent__state" aria-hidden="true" />
                <span className="demo-agent__name">
                  {r.company} <span className="demo-chip__ticker">{r.ticker}</span>
                </span>
                <span className="demo-agent__result">
                  {state === "done" ? "memo cached" : state === "running" ? "running 5 agents…" : "queued"}
                </span>
              </li>
            );
          })}
          <li className={`demo-agent demo-agent--synthesis demo-agent--${phase === "ranking" ? "running" : "idle"}`}>
            <span className="demo-agent__state" aria-hidden="true" />
            <span className="demo-agent__name">Recommender</span>
            <span className="demo-agent__result">
              {phase === "ranking" ? `ranking ${report.ratings.length} memos…` : "waiting for all memos"}
            </span>
          </li>
        </ol>
      )}

      {report && phase === "report" && (
        <div className="memo">
          <div className="memo__head">
            <div>
              <div className="kicker">Weekly report</div>
              <h3 className="memo__title">Week {report.week.replace("2026-W", "")} · 2026</h3>
              <div className="memo__meta">
                Generated {report.generatedAt} · {report.ratings.length} stocks ranked · {report.model}
              </div>
            </div>
          </div>

          <ol className="ranking">
            {report.ratings.map((r) => {
              const expanded = open === r.ticker;
              return (
                <li key={r.ticker} className="ranking__row">
                  <button
                    type="button"
                    className="ranking__head"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : r.ticker)}
                  >
                    <span className="memo-section__n">{String(r.rank).padStart(2, "0")}</span>
                    <span className="ranking__name">
                      <span className="ranking__company">{r.company}</span>
                      <span className="ranking__sector">
                        {r.ticker} · {r.sector}
                      </span>
                    </span>
                    <span className="memo-section__right">
                      {r.weight > 0 && <span className="demo-flag demo-flag--muted">{r.weight}% wt</span>}
                      <RatingBadge rating={r.rating} />
                      <span className="memo-section__chev" aria-hidden="true">
                        {expanded ? "–" : "+"}
                      </span>
                    </span>
                  </button>
                  {expanded && (
                    <div className="memo-section__body ranking__body">
                      <p>
                        <strong className="ranking__label ranking__label--bull">Bull</strong> {r.bull}
                      </p>
                      <p>
                        <strong className="ranking__label ranking__label--bear">Bear</strong> {r.bear}
                      </p>
                      <p>
                        <strong className="ranking__label">Why</strong> {r.rationale}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="memo__cols">
            <div>
              <div className="kicker">Top picks</div>
              <div className="demo__chips ranking__picks">
                {report.topPicks.map((p) => (
                  <span key={p} className="demo-pick demo-pick--top">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="kicker">Avoid</div>
              <div className="demo__chips ranking__picks">
                {report.avoid.map((p) => (
                  <span key={p} className="demo-pick demo-pick--avoid">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="kicker">Macro commentary</div>
            <p className="memo__summary ranking__macro">{report.macro}</p>
          </div>

          {Object.keys(report.sectorViews).length > 0 && (
            <div>
              <div className="kicker">Sector views</div>
              <ul className="memo__list ranking__sectors">
                {Object.entries(report.sectorViews).map(([sector, view]) => (
                  <li key={sector}>
                    <strong>{sector}:</strong> {view}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ── Tab 3: portfolio builder ───────────────────────────────────────────── */

// Ported from src/scheduler/portfolio_builder.py.
const RATING_BOOST: Record<string, number> = { "STRONG BUY": 1.5, BUY: 1.0 };

function capAndNormalise(weights: number[], cap: number): number[] {
  const w = [...weights];
  for (let pass = 0; pass < 30; pass++) {
    const excess = w.reduce((sum, x) => sum + Math.max(0, x - cap), 0);
    if (excess < 1e-8) break;
    const uncapped = w.map((x, i) => (x < cap ? i : -1)).filter((i) => i >= 0);
    if (uncapped.length === 0) break;
    const perItem = excess / uncapped.length;
    for (let i = 0; i < w.length; i++) w[i] = w[i] >= cap ? cap : Math.min(cap, w[i] + perItem);
  }
  const total = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((x) => (x / total) * 100);
}

function buildPortfolio(report: Weekly, amount: number, maxPositions: number, maxPositionPct: number, strongOnly: boolean) {
  const eligible = strongOnly ? ["STRONG BUY"] : ["STRONG BUY", "BUY"];
  const candidates = report.ratings.filter((r) => eligible.includes(r.rating)).slice(0, maxPositions);
  if (candidates.length === 0) return null;
  const raw = candidates.map((r) => r.weight * (RATING_BOOST[r.rating] ?? 1) * r.confidence);
  const totalRaw = raw.reduce((a, b) => a + b, 0) || 1;
  const weights = capAndNormalise(
    raw.map((x) => (x / totalRaw) * 100),
    maxPositionPct,
  );
  const holdings = candidates.map((r, i) => ({ ...r, weightPct: weights[i], dollars: (amount * weights[i]) / 100 }));
  const sectors: Record<string, number> = {};
  for (const h of holdings) sectors[h.sector] = (sectors[h.sector] ?? 0) + h.weightPct;
  return {
    holdings,
    sectors: Object.entries(sectors).sort((a, b) => b[1] - a[1]),
    strongBuys: holdings.filter((h) => h.rating === "STRONG BUY").length,
  };
}

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function PortfolioTab() {
  const latest = weekly[weekly.length - 1];
  const [week, setWeek] = useState(latest.week);
  const [amount, setAmount] = useState(100000);
  const [maxPositions, setMaxPositions] = useState(10);
  const [maxPct, setMaxPct] = useState(30);
  const [strongOnly, setStrongOnly] = useState(false);

  const report = weekly.find((w) => w.week === week) ?? latest;
  const result = useMemo(
    () => buildPortfolio(report, amount, maxPositions, maxPct, strongOnly),
    [report, amount, maxPositions, maxPct, strongOnly],
  );

  return (
    <>
      <div className="demo__prompt">
        <span className="demo__caret" aria-hidden="true">
          ›
        </span>
        <span>Build a portfolio from the {report.week} ratings</span>
      </div>

      <div className="builder">
        <label className="builder__field">
          <span>Report</span>
          <select value={week} onChange={(e) => setWeek(e.target.value)}>
            {weekly.map((w) => (
              <option key={w.week} value={w.week}>
                {w.week}
              </option>
            ))}
          </select>
        </label>
        <label className="builder__field">
          <span>Capital</span>
          <input
            type="number"
            min={1000}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="builder__field">
          <span>Max positions · {maxPositions}</span>
          <input type="range" min={1} max={10} value={maxPositions} onChange={(e) => setMaxPositions(Number(e.target.value))} />
        </label>
        <label className="builder__field">
          <span>Max per position · {maxPct}%</span>
          <input type="range" min={10} max={50} step={5} value={maxPct} onChange={(e) => setMaxPct(Number(e.target.value))} />
        </label>
        <label className="builder__field builder__field--check">
          <input type="checkbox" checked={strongOnly} onChange={(e) => setStrongOnly(e.target.checked)} />
          <span>Strong Buy only</span>
        </label>
      </div>

      {result ? (
        <div className="memo">
          <div className="memo__head">
            <div>
              <div className="kicker">Allocation</div>
              <h3 className="memo__title">{money(amount)}</h3>
              <div className="memo__meta">
                {result.holdings.length} holdings · {result.strongBuys} strong buy · weight = suggested % × rating boost × confidence, capped at {maxPct}%
              </div>
            </div>
          </div>

          <ol className="holdings">
            {result.holdings.map((h) => (
              <li key={h.ticker} className="holding">
                <span className="holding__name">
                  <span className="ranking__company">{h.company}</span>
                  <span className="ranking__sector">
                    {h.ticker} · {h.sector}
                  </span>
                </span>
                <span className="holding__bar" aria-hidden="true">
                  <i style={{ width: `${h.weightPct}%` }} />
                </span>
                <span className="holding__figures">
                  <RatingBadge rating={h.rating} />
                  <span className="holding__pct">{h.weightPct.toFixed(1)}%</span>
                  <span className="holding__usd">{money(h.dollars)}</span>
                </span>
              </li>
            ))}
          </ol>

          <div>
            <div className="kicker">Sector breakdown</div>
            <ul className="sectors">
              {result.sectors.map(([sector, pct]) => (
                <li key={sector}>
                  <span className="sectors__name">{sector}</span>
                  <span className="holding__bar" aria-hidden="true">
                    <i style={{ width: `${pct}%` }} />
                  </span>
                  <span className="holding__pct">{pct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="builder__note">
            The real builder also fetches live prices to turn these into share counts and benchmarks the result against the
            S&amp;P 500 over 1W / 1M / 3M / YTD. Both need market data, so they're left out of this page.
          </p>
        </div>
      ) : (
        <div className="memo">
          <p className="memo__summary">No {strongOnly ? "Strong Buy" : "Buy or Strong Buy"} rated stocks in this report.</p>
        </div>
      )}
    </>
  );
}

/* ── Shell ──────────────────────────────────────────────────────────────── */

const TABS = [
  { key: "analyse", label: "Analyse a company", meta: "5 agents · synthesis" },
  { key: "weekly", label: "Weekly rankings", meta: `${weekly.length} saved reports` },
  { key: "portfolio", label: "Portfolio builder", meta: "live allocation" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function DeepDiligenceDemo() {
  const [tab, setTab] = useState<TabKey>("analyse");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="demo" aria-live="polite">
      <div className="demo__bar">
        <span className="demo__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="demo__title">deepdiligence · {tab}</span>
        <span className="demo__meta">{active.meta}</span>
      </div>

      <div className="demo__tabs" role="tablist" aria-label="DeepDiligence features">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`demo-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="demo__body" role="tabpanel">
        {tab === "analyse" && <AnalyseTab />}
        {tab === "weekly" && <WeeklyTab />}
        {tab === "portfolio" && <PortfolioTab />}
      </div>
    </div>
  );
}

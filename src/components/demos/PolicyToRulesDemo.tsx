"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import data from "@/data/policy-to-rules-demo.json";

type Rule = {
  rule_id: string;
  cpt_codes: string[];
  covered_diagnoses: string[];
  frequency_limit: { max_count: number | null; period_months: number | null; applies_to: string };
  exceptions: string[];
  decision_logic: string;
  source_reference: string;
};
type Claim = {
  id: string;
  cpt: string;
  dx: string[];
  dateOfService: string;
  priorTestDate: string | null;
  note: string;
  expected: "APPROVE" | "DENY" | null;
};
type Decision = {
  decision: "APPROVE" | "DENY";
  ruleId: string | null;
  reason: string;
  reference: string;
  checks: string[];
};

const { policy, rules, claims, rates, cptNames } = data as unknown as {
  policy: { id: string; name: string; text: string };
  rules: Rule[];
  claims: Claim[];
  rates: Record<string, number>;
  cptNames: Record<string, string>;
};

/* ── The adjudication engine, ported line for line from src/engine.js ─────
   Plain code, no AI: CPT matching, ICD-10 prefix logic and real date math. */

function diagnosisMatches(claimDx: string, entry: string): boolean {
  const e = entry.trim();
  if (e.toLowerCase().endsWith(".x")) {
    const base = e.slice(0, -2);
    return claimDx === base || claimDx.startsWith(`${base}.`);
  }
  return claimDx === e || claimDx.startsWith(`${e}.`);
}

function anyDiagnosisCovered(dx: string[], rule: Rule): boolean {
  return dx.some((d) => rule.covered_diagnoses.some((entry) => diagnosisMatches(d, entry)));
}

// Whole months elapsed; a month only counts once its day-of-month is reached.
function monthsBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  return months;
}

const MALABSORPTION_PREFIXES = ["K90", "K50"];

function exceptionInterval(text: string): number | null {
  const m = text.match(/(\d+)\s*month/i);
  return m ? Number.parseInt(m[1], 10) : null;
}

function malabsorptionException(dx: string[], rule: Rule): { interval: number; text: string } | null {
  const has = dx.some((d) => MALABSORPTION_PREFIXES.some((p) => d === p || d.startsWith(p)));
  if (!has) return null;
  for (const ex of rule.exceptions ?? []) {
    if (/malabsorption|repletion/i.test(ex)) {
      const interval = exceptionInterval(ex);
      if (interval) return { interval, text: ex };
    }
  }
  return null;
}

type ClaimInput = { cpt: string; dx: string[]; dateOfService: string; priorTestDate: string | null };

function adjudicate(ruleSet: Rule[], claim: ClaimInput): Decision {
  const checks: string[] = [];
  const governing = ruleSet.filter((r) => (r.cpt_codes ?? []).includes(claim.cpt));
  checks.push(
    `CPT ${claim.cpt}: ${governing.length} governing rule(s) [${governing.map((r) => r.rule_id).join(", ") || "none"}]`,
  );
  if (governing.length === 0) {
    return {
      decision: "DENY",
      ruleId: null,
      reason: `CPT ${claim.cpt} is not addressed by this policy.`,
      reference: "No rule in policy governs this service.",
      checks,
    };
  }

  const positive = governing.filter((r) => (r.covered_diagnoses ?? []).length > 0);
  const negative = governing.filter((r) => (r.covered_diagnoses ?? []).length === 0);
  const matched = positive.find((r) => anyDiagnosisCovered(claim.dx, r));
  const dxList = claim.dx.join(", ");

  if (!matched) {
    const cite = negative[0] ?? positive[0] ?? governing[0];
    checks.push(`Diagnoses [${dxList}] matched no covered indication for CPT ${claim.cpt}.`);
    return {
      decision: "DENY",
      ruleId: cite.rule_id,
      reason: `Diagnosis ${dxList} is not a covered indication for CPT ${claim.cpt}.`,
      reference: cite.source_reference,
      checks,
    };
  }
  checks.push(`Diagnosis matched covered indication under ${matched.rule_id}.`);

  const freq = matched.frequency_limit;
  if (freq?.period_months && claim.priorTestDate) {
    const elapsed = monthsBetween(claim.priorTestDate, claim.dateOfService);
    checks.push(`Frequency: ${elapsed} month(s) since prior test (limit: 1 per ${freq.period_months}).`);
    if (elapsed < freq.period_months) {
      const exc = malabsorptionException(claim.dx, matched);
      if (exc) {
        checks.push(`Exception applies (every ${exc.interval} months for malabsorption/repletion).`);
        if (elapsed >= exc.interval) {
          return {
            decision: "APPROVE",
            ruleId: matched.rule_id,
            reason: `Approved under the malabsorption/repletion exception: ${elapsed} months meets the ${exc.interval}-month interval.`,
            reference: matched.source_reference,
            checks,
          };
        }
        return {
          decision: "DENY",
          ruleId: matched.rule_id,
          reason: `Denied: ${elapsed} months is shorter than even the ${exc.interval}-month exception interval.`,
          reference: matched.source_reference,
          checks,
        };
      }
      return {
        decision: "DENY",
        ruleId: matched.rule_id,
        reason: `Denied: retested after ${elapsed} months, inside the ${freq.period_months}-month frequency limit, and no exception applies.`,
        reference: matched.source_reference,
        checks,
      };
    }
  } else {
    checks.push("Frequency: no prior test or no limit on this rule — not applicable.");
  }

  return {
    decision: "APPROVE",
    ruleId: matched.rule_id,
    reason: `Approved: CPT ${claim.cpt} is covered for ${dxList} and the frequency limit is satisfied.`,
    reference: matched.source_reference,
    checks,
  };
}

// The Aug 2026 re-extraction dropped the interval from R1's malabsorption exception, so the
// engine can't apply it. This is the patch the reconciliation loop exists to make: restore the
// policy's own wording, then re-run the engine (the loop's backward edge).
const PATCH = {
  rule_id: "R1",
  field: "exceptions",
  before: rules.find((r) => r.rule_id === "R1")?.exceptions ?? [],
  after: ["patients with malabsorption syndromes or undergoing active repletion therapy may be tested up to once every 3 months"],
};
const PATCHED_RULES: Rule[] = rules.map((r) => (r.rule_id === PATCH.rule_id ? { ...r, exceptions: PATCH.after } : r));

/* ── Shared bits ─────────────────────────────────────────────────────────── */

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

function DecisionBadge({ decision }: { decision: "APPROVE" | "DENY" }) {
  return <span className={`demo-rating demo-rating--${decision === "APPROVE" ? "buy" : "sell"}`}>{decision}</span>;
}

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// The quoted phrases inside a rule's source reference, e.g. "limited to once every 12 months".
function quotedPhrases(reference: string): string[] {
  return [...reference.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/* ── Tab 1: policy → rules ──────────────────────────────────────────────── */

const EXTRACT_STEPS = ["reading policy prose…", "identifying CPT codes and covered diagnoses…", "structuring frequency limits and exceptions…"];
const EXTRACT_STEP_MS = 900;

function ExtractTab() {
  const replay = useReplay();
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  const [active, setActive] = useState<string | null>(null);

  const run = () => {
    replay.clear();
    setPhase("running");
    setStep(0);
    setShown(0);
    setActive(null);
    EXTRACT_STEPS.forEach((_, i) => replay.schedule(EXTRACT_STEP_MS * i, () => setStep(i)));
    const t0 = EXTRACT_STEP_MS * EXTRACT_STEPS.length;
    rules.forEach((_, i) => replay.schedule(t0 + 350 * i, () => setShown(i + 1)));
    replay.schedule(t0 + 350 * rules.length, () => setPhase("done"));
  };

  // Highlight the active rule's quoted policy text.
  const highlights = useMemo(() => {
    const rule = rules.find((r) => r.rule_id === active);
    return rule ? quotedPhrases(rule.source_reference) : [];
  }, [active]);

  const policyLines = policy.text.split("\n");

  return (
    <>
      <div className="demo__prompt">
        <span className="demo__caret" aria-hidden="true">
          ›
        </span>
        <span>
          Extract rules from {policy.id} · {policy.name}
        </span>
      </div>

      <div className="p2r">
        <div className="p2r__policy">
          <div className="p2r__label">Payer policy (prose)</div>
          <pre className="p2r__text">
            {policyLines.map((line, i) => {
              const hit = highlights.find((h) => line.toLowerCase().includes(h.toLowerCase()));
              return (
                <span key={`${i}-${line.slice(0, 12)}`} className={hit ? "p2r__line p2r__line--hit" : "p2r__line"}>
                  {line}
                  {"\n"}
                </span>
              );
            })}
          </pre>
        </div>

        <div className="p2r__rules">
          <div className="p2r__label p2r__label--row">
            <span>Machine-readable rules (JSON)</span>
            <button type="button" className="demo-chip" onClick={run} disabled={phase === "running"}>
              {phase === "done" ? "Extract again" : "Extract rules"}
            </button>
          </div>

          {phase === "idle" && <p className="p2r__hint">An LLM agent reads the prose on the left and emits structured claim-editing rules.</p>}

          {phase === "running" && shown === 0 && (
            <ol className="demo-agents">
              {EXTRACT_STEPS.map((s, i) => (
                <li key={s} className={`demo-agent demo-agent--${i < step ? "done" : i === step ? "running" : "idle"}`}>
                  <span className="demo-agent__state" aria-hidden="true" />
                  <span className="demo-agent__name">Extraction agent</span>
                  <span className="demo-agent__result">{s}</span>
                </li>
              ))}
            </ol>
          )}

          {shown > 0 && (
            <ol className="p2r__rulelist">
              {rules.slice(0, shown).map((r) => {
                const open = active === r.rule_id;
                return (
                  <li key={r.rule_id} className={`p2r__rule${open ? " is-active" : ""}`}>
                    <button type="button" className="p2r__rulehead" aria-expanded={open} onClick={() => setActive(open ? null : r.rule_id)}>
                      <span className="memo-section__n">{r.rule_id}</span>
                      <span className="p2r__ruletitle">
                        <span className="ranking__company">
                          CPT {r.cpt_codes.join(", ")} · {r.covered_diagnoses.length > 0 ? "coverage" : "non-covered"}
                          {r.frequency_limit.period_months ? ` · 1 per ${r.frequency_limit.period_months} mo` : ""}
                        </span>
                        <span className="ranking__sector">{r.decision_logic}</span>
                      </span>
                      <span className="memo-section__chev" aria-hidden="true">
                        {open ? "–" : "+"}
                      </span>
                    </button>
                    {open && (
                      <div className="p2r__rulebody">
                        {r.covered_diagnoses.length > 0 && (
                          <div>
                            <span className="ranking__label">Dx</span>
                            <span className="p2r__codes">
                              {r.covered_diagnoses.map((d) => (
                                <code key={d}>{d}</code>
                              ))}
                            </span>
                          </div>
                        )}
                        {r.exceptions.length > 0 && (
                          <div>
                            <span className="ranking__label">Exc</span> {r.exceptions.join("; ")}
                          </div>
                        )}
                        <div className="p2r__source">
                          <span className="ranking__label">Source</span> {r.source_reference}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {phase === "done" && <p className="p2r__hint">Click a rule to see the policy sentence it came from.</p>}
        </div>
      </div>
    </>
  );
}

/* ── Tab 2: adjudicate claims ───────────────────────────────────────────── */

const CLAIM_STEP_MS = 650;

function AdjudicateTab() {
  const replay = useReplay();
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [patched, setPatched] = useState(false);

  const activeRules = patched ? PATCHED_RULES : rules;
  const decisions = useMemo(() => claims.map((c) => ({ claim: c, result: adjudicate(activeRules, c) })), [activeRules]);

  const run = () => {
    replay.clear();
    setDone(0);
    setOpen(null);
    setRunning(true);
    claims.forEach((_, i) => replay.schedule(CLAIM_STEP_MS * (i + 1), () => setDone(i + 1)));
    replay.schedule(CLAIM_STEP_MS * (claims.length + 1), () => setRunning(false));
  };

  const finished = decisions.slice(0, done);
  const approved = finished.filter((d) => d.result.decision === "APPROVE").length;
  const denied = finished.length - approved;
  const flagged = finished
    .filter((d) => d.result.decision === "DENY")
    .reduce((sum, d) => sum + (rates[d.claim.cpt] ?? 0), 0);
  const matchesExpected = finished.filter((d) => d.result.decision === d.claim.expected).length;
  const mismatches = finished.filter((d) => d.claim.expected && d.result.decision !== d.claim.expected);
  const complete = done === claims.length && !running;

  const applyPatch = (on: boolean) => {
    replay.clear();
    setPatched(on);
    setOpen(null);
    setRunning(false);
    setDone(claims.length);
  };

  return (
    <>
      <div className="demo__prompt">
        <span className="demo__caret" aria-hidden="true">
          ›
        </span>
        <span>Adjudicate {claims.length} sample claims against the extracted rules</span>
      </div>

      <div className="demo__chips">
        <button type="button" className="demo-chip" onClick={run} disabled={running}>
          {done === claims.length ? "Run again" : "Run all claims"}
        </button>
      </div>

      {done > 0 && (
        <div className="kpis">
          <div className="kpi">
            <span className="kpi__n">{finished.length}</span>
            <span className="kpi__l">claims run</span>
          </div>
          <div className="kpi kpi--good">
            <span className="kpi__n">{approved}</span>
            <span className="kpi__l">approved</span>
          </div>
          <div className="kpi kpi--bad">
            <span className="kpi__n">{denied}</span>
            <span className="kpi__l">denied</span>
          </div>
          <div className="kpi kpi--gold">
            <span className="kpi__n">{money(flagged)}</span>
            <span className="kpi__l">flagged on denials</span>
          </div>
          <div className="kpi">
            <span className="kpi__n">
              {matchesExpected}/{finished.length}
            </span>
            <span className="kpi__l">match expected</span>
          </div>
        </div>
      )}

      {done > 0 && (
        <ol className="claims">
          {decisions.map(({ claim, result }, i) => {
            const state = i < done ? "done" : i === done && running ? "running" : "idle";
            if (state === "idle") return null;
            const expanded = open === claim.id;
            return (
              <li key={claim.id} className={`claim claim--${state}`}>
                <button type="button" className="claim__head" aria-expanded={expanded} onClick={() => state === "done" && setOpen(expanded ? null : claim.id)}>
                  <span className="claim__id">{claim.id}</span>
                  <span className="claim__facts">
                    <span className="ranking__company">
                      CPT {claim.cpt} <span className="claim__cptname">{cptNames[claim.cpt]}</span> · dx {claim.dx.join(", ")}
                    </span>
                    <span className="ranking__sector">
                      {claim.priorTestDate ? `prior test ${claim.priorTestDate} · ` : ""}
                      {claim.note}
                    </span>
                  </span>
                  <span className="memo-section__right">
                    {state === "running" ? (
                      <span className="demo-agent__result">adjudicating…</span>
                    ) : (
                      <>
                        {result.decision === "DENY" && <span className="demo-flag demo-flag--muted">{money(rates[claim.cpt] ?? 0)}</span>}
                        <span className="demo-flag demo-flag--muted">rule {result.ruleId}</span>
                        <DecisionBadge decision={result.decision} />
                        <span className="memo-section__chev" aria-hidden="true">
                          {expanded ? "–" : "+"}
                        </span>
                      </>
                    )}
                  </span>
                </button>
                {state === "done" && (
                  <div className="claim__reason">
                    {result.reason}
                    {claim.expected && claim.expected !== result.decision && (
                      <span className="demo-flag"> · expected {claim.expected}</span>
                    )}
                  </div>
                )}
                {expanded && (
                  <div className="memo-section__body claim__body">
                    <div>
                      <div className="kicker">Engine trace</div>
                      <ol className="claim__trace">
                        {result.checks.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <div className="kicker">Policy reference</div>
                      <p className="claim__ref">{result.reference}</p>
                    </div>
                    <div>
                      <div className="kicker">Cross-check</div>
                      <p className="claim__ref">
                        In the real system a second LLM reads the policy prose, not these rules, and decides the claim independently.
                        Agreement converges; disagreement triggers the reconciliation loop. It needs an API key, so it isn't run on this page.
                      </p>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {complete && !patched && mismatches.length > 0 && (
        <div className="memo-conflicts">
          <div className="kicker">Mismatch flagged</div>
          <p className="claim__ref">
            {mismatches.map((d) => d.claim.id).join(", ")} came out {mismatches[0].result.decision} but the sample notes expect{" "}
            {mismatches[0].claim.expected}. The re-extracted rule R1 lists the malabsorption exception without its 3-month interval,
            so the engine can't apply it. This is a rule-extraction error, the case the reconciliation loop is built for: patch the rule
            with the policy's own wording and re-run.
          </p>
          <div className="demo__chips">
            <button type="button" className="demo-chip" onClick={() => applyPatch(true)}>
              Patch R1 and re-run
            </button>
          </div>
        </div>
      )}

      {complete && patched && (
        <div className="memo-conflicts memo-conflicts--ok">
          <div className="kicker">Rule patched · engine re-run</div>
          <p className="claim__ref">
            <span className="ranking__label">R1.exceptions</span> {JSON.stringify(PATCH.before)} → {JSON.stringify(PATCH.after)}
          </p>
          <p className="claim__ref">Same claims, same engine, patched rule: every decision now matches its annotated expectation.</p>
          <div className="demo__chips">
            <button type="button" className="demo-chip demo-chip--ghost" onClick={() => applyPatch(false)}>
              Revert patch
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Tab 3: try your own claim ──────────────────────────────────────────── */

const DX_OPTIONS = [
  { code: "E55.9", label: "Vitamin D deficiency" },
  { code: "N18.4", label: "Chronic kidney disease, stage 4" },
  { code: "M81.0", label: "Osteoporosis" },
  { code: "K90.0", label: "Celiac disease (malabsorption)" },
  { code: "K50.1", label: "Crohn's disease of large intestine" },
  { code: "K74.6", label: "Cirrhosis of liver" },
  { code: "E83.52", label: "Hypercalcemia" },
  { code: "Z00.00", label: "Routine wellness visit" },
  { code: "J06.9", label: "Upper respiratory infection" },
];

function TryTab() {
  const [cpt, setCpt] = useState("82306");
  const [dx, setDx] = useState("E55.9");
  const [monthsAgo, setMonthsAgo] = useState(0); // 0 = no prior test

  const claim = useMemo<ClaimInput>(() => {
    const service = "2025-06-01";
    let prior: string | null = null;
    if (monthsAgo > 0) {
      const d = new Date(`${service}T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() - monthsAgo);
      prior = d.toISOString().slice(0, 10);
    }
    return { cpt, dx: [dx], dateOfService: service, priorTestDate: prior };
  }, [cpt, dx, monthsAgo]);

  const result = useMemo(() => adjudicate(rules, claim), [claim]);

  return (
    <>
      <div className="demo__prompt">
        <span className="demo__caret" aria-hidden="true">
          ›
        </span>
        <span>Build a claim and watch the engine decide it</span>
      </div>

      <div className="builder">
        <label className="builder__field">
          <span>Procedure (CPT)</span>
          <select value={cpt} onChange={(e) => setCpt(e.target.value)}>
            {Object.entries(cptNames).map(([code, name]) => (
              <option key={code} value={code}>
                {code} · {name}
              </option>
            ))}
          </select>
        </label>
        <label className="builder__field">
          <span>Diagnosis (ICD-10)</span>
          <select value={dx} onChange={(e) => setDx(e.target.value)}>
            {DX_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code} · {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="builder__field">
          <span>Prior test · {monthsAgo === 0 ? "none" : `${monthsAgo} month${monthsAgo > 1 ? "s" : ""} ago`}</span>
          <input type="range" min={0} max={14} value={monthsAgo} onChange={(e) => setMonthsAgo(Number(e.target.value))} />
        </label>
      </div>

      <div className="memo">
        <div className="memo__head">
          <div>
            <div className="kicker">Decision</div>
            <h3 className="memo__title">
              <DecisionBadge decision={result.decision} />
            </h3>
            <div className="memo__meta">
              rule {result.ruleId ?? "none"} · {result.decision === "DENY" ? `${money(rates[cpt] ?? 0)} flagged` : `${money(rates[cpt] ?? 0)} payable`}
            </div>
          </div>
        </div>
        <p className="memo__summary">{result.reason}</p>
        <div>
          <div className="kicker">Engine trace</div>
          <ol className="claim__trace">
            {result.checks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </div>
        <div>
          <div className="kicker">Policy reference</div>
          <p className="claim__ref">{result.reference}</p>
        </div>
      </div>
    </>
  );
}

/* ── Shell ──────────────────────────────────────────────────────────────── */

const TABS = [
  { key: "extract", label: "Policy → rules", meta: `${rules.length} rules` },
  { key: "adjudicate", label: "Adjudicate claims", meta: `${claims.length} sample claims` },
  { key: "try", label: "Try a claim", meta: "live engine" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function PolicyToRulesDemo() {
  const [tab, setTab] = useState<TabKey>("extract");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="demo" aria-live="polite">
      <div className="demo__bar">
        <span className="demo__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="demo__title">policy-to-rules · {policy.id}</span>
        <span className="demo__meta">{active.meta}</span>
      </div>
      <div className="demo__tabs" role="tablist" aria-label="Policy-to-Rules features">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`demo-tab${tab === t.key ? " is-active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="demo__body" role="tabpanel">
        {tab === "extract" && <ExtractTab />}
        {tab === "adjudicate" && <AdjudicateTab />}
        {tab === "try" && <TryTab />}
      </div>
    </div>
  );
}

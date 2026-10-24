import type { ComponentType } from "react";
import { DeepDiligenceDemo } from "./DeepDiligenceDemo";
import { PolicyToRulesDemo } from "./PolicyToRulesDemo";
import { TransformerMonitorDemo } from "./TransformerMonitorDemo";

type Demo = { Component: ComponentType; note: string };

/** Interactive recreations shown on a project's case-study page, keyed by slug. */
const demos: Record<string, Demo> = {
  "cotiviti-policy-to-rules": {
    Component: PolicyToRulesDemo,
    note: "The policy, the extracted rules, the sample claims and the reimbursement rates are the project's own files, and the adjudication engine is the project's own code, ported line for line and run live in your browser. The extraction step is replayed; the LLM cross-check needs an API key, so it is described rather than run. Nothing is sent anywhere.",
  },
  "transformer-capacity-monitor": {
    Component: TransformerMonitorDemo,
    note: "This is the project's own report for the period ending 2026-10-15: all 500 transformers with their tier, the rule that set it, their 60-day control charts and capability figures, drawn over the real municipal boundaries. The data is the synthetic set the project ships with. Decisions you record here stay in your browser; nothing is sent anywhere.",
  },
  deepdiligence: {
    Component: DeepDiligenceDemo,
    note: "Everything here is DeepDiligence's own output. Analyse replays five real runs from its cache (April–May 2026): the agents' actual findings, confidence scores, citations and flagged conflicts. Weekly rankings replays four saved reports. The portfolio builder runs the real allocation formula on those ratings in your browser. Only the timing is simulated; nothing is sent anywhere.",
  },
};

export function getDemo(slug: string): Demo | undefined {
  return demos[slug];
}

import type { ComponentType } from "react";
import { DeepDiligenceDemo } from "./DeepDiligenceDemo";

type Demo = { Component: ComponentType; note: string };

/** Interactive recreations shown on a project's case-study page, keyed by slug. */
const demos: Record<string, Demo> = {
  deepdiligence: {
    Component: DeepDiligenceDemo,
    note: "Everything here is DeepDiligence's own output. Analyse replays five real runs from its cache (April–May 2026): the agents' actual findings, confidence scores, citations and flagged conflicts. Weekly rankings replays four saved reports. The portfolio builder runs the real allocation formula on those ratings in your browser. Only the timing is simulated; nothing is sent anywhere.",
  },
};

export function getDemo(slug: string): Demo | undefined {
  return demos[slug];
}

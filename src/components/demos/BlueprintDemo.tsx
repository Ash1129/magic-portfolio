"use client";

import { useState } from "react";

const SITE = "https://blueprintstudio.me";

/** The live site, framed like the other demos, with a way out to the full window. */
export function BlueprintDemo() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="demo bp">
      <div className="demo__bar">
        <span className="demo__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="demo__title">blueprintstudio.me</span>
        <a className="bp__open" href={SITE} target="_blank" rel="noopener noreferrer">
          Open in a new tab ↗
        </a>
      </div>
      <div className={`bp__frame${loaded ? " is-loaded" : ""}`}>
        {!loaded && <span className="bp__loading">Loading the live site…</span>}
        <iframe
          src={`${SITE}/#/`}
          title="Blueprint: the Agent Architecture Guide (live site)"
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

export type OutlineItem = { id: string; label: string };

/**
 * A Notion-style page outline pinned to the right edge: one dash per section,
 * the current section's dash highlighted, and section names revealed on hover.
 */
export function PageOutline({ items }: { items: OutlineItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const [near, setNear] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // Wake the dashes when the pointer comes close. Measured in JS rather than with
  // an invisible hover zone, so nothing under the outline becomes unclickable.
  useEffect(() => {
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        const dx = Math.max(box.left - event.clientX, 0, event.clientX - box.right);
        const dy = Math.max(box.top - event.clientY, 0, event.clientY - box.bottom);
        setNear(dx < 90 && dy < 60);
      });
    };
    const onLeaveWindow = (event: PointerEvent) => {
      if (!event.relatedTarget) setNear(false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onLeaveWindow);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeaveWindow);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      // The current section is the last one whose top has passed a line 35% down the viewport.
      const line = window.innerHeight * 0.35;
      let current = items[0]?.id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= line) current = item.id;
      }
      // At the very bottom the last section may never reach the line; count it as current.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActive(atBottom ? items[items.length - 1]?.id : current);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  return (
    <nav ref={ref} className={`outline${near ? " is-near" : ""}`} aria-label="On this page">
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={item.id === active ? "is-active" : undefined}
              aria-current={item.id === active ? "location" : undefined}
            >
              <span className="outline__label">{item.label}</span>
              <span className="outline__dash" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

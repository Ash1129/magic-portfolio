"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * Wraps the marquee and slows its CSS animation while hovered instead of pausing it.
 * Changing playbackRate keeps the strip's position, so there's no jump; the rate is
 * eased over a short tween so the slowdown glides.
 */
export function SlowOnHover({ children, rate = 0.4 }: { children: ReactNode; rate?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const easeTo = (target: number) => {
    const animation = ref.current?.querySelector(".marquee__track")?.getAnimations()[0];
    if (!animation) return;
    cancelAnimationFrame(frame.current);
    const from = animation.playbackRate;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 400);
      animation.playbackRate = from + (target - from) * t;
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  return (
    <div
      ref={ref}
      className="marquee"
      onPointerEnter={() => easeTo(rate)}
      onPointerLeave={() => easeTo(1)}
    >
      {children}
    </div>
  );
}

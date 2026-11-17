"use client";

import { useEffect } from "react";

const subscribers = new Set<() => void>();
let frame: number | undefined;

function schedule() {
  if (frame !== undefined) return;
  frame = window.requestAnimationFrame(() => {
    frame = undefined;
    subscribers.forEach((update) => update());
  });
}

// Both the story and the statement share one event-driven scroll scheduler.
export function useScrollFrame(update: () => void) {
  useEffect(() => {
    const first = subscribers.size === 0;
    subscribers.add(update);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (first) {
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
    }
    motion.addEventListener("change", schedule);
    schedule();
    return () => {
      subscribers.delete(update);
      motion.removeEventListener("change", schedule);
      if (!subscribers.size) {
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        frame = undefined;
      }
    };
  }, [update]);
}

export function clampProgress(value: number) {
  return Math.max(0, Math.min(1, value));
}

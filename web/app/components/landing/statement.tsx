"use client";

import { useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import { clampProgress, useScrollFrame } from "./scroll-frame";

const lines = ["THE AI CAN BE FOOLED.", "THE MONEY CAN'T."];

export function Statement() {
  const section = useRef<HTMLElement>(null);
  const update = useCallback(() => {
    const element = section.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      delete element.dataset.fallback;
      return;
    }
    if (CSS.supports("animation-timeline", "view()")) return;
    const bounds = element.getBoundingClientRect();
    const progress = clampProgress(
      (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height),
    );
    element.dataset.fallback = "true";
    element
      .querySelectorAll<HTMLElement>(".statement-word")
      .forEach((word, index) => {
        word.dataset.lit = String(progress >= 0.12 + index * 0.065);
      });
  }, []);
  useScrollFrame(update);
  let wordIndex = 0;
  return (
    <section
      className="landing-statement"
      ref={section}
      aria-labelledby="statement-title"
    >
      <h2 id="statement-title">
        {lines.map((line) => (
          <span className="statement-line" key={line}>
            {line.split(" ").map((word, index) => {
              const n = wordIndex++;
              return (
                <span
                  key={word}
                  style={
                    {
                      "--word-start": `${12 + n * 6.5}%`,
                      "--word-end": `${25 + n * 6.5}%`,
                    } as CSSProperties
                  }
                >
                  <span className="statement-word">{word}</span>
                  {index < line.split(" ").length - 1 ? " " : ""}
                </span>
              );
            })}
          </span>
        ))}
      </h2>
    </section>
  );
}

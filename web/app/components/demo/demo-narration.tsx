"use client";

import { useEffect, useRef, useState } from "react";

export function DemoNarration({
  text,
  beat,
  mood,
  dock,
  paused,
  onPause,
  onNext,
  onExit,
}: {
  text: string;
  beat: number;
  mood: "point" | "refuse" | "thumbs";
  dock: "top" | "bottom";
  paused: boolean;
  onPause: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  useEffect(() => {
    countRef.current = 0;
    setCount(0);
  }, [text]);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      countRef.current = Math.min(text.length, countRef.current + 1);
      setCount(countRef.current);
      if (countRef.current === text.length) clearInterval(timer);
    }, 12);
    return () => clearInterval(timer);
  }, [text, paused]);
  return (
    <section
      className={`demo-narration dock-${dock}`}
      aria-label="Live demo controls"
    >
      <div
        className="demo-progress"
        role="progressbar"
        aria-label="Demo progress"
        aria-valuemin={0}
        aria-valuemax={16}
        aria-valuenow={beat}
      >
        <span style={{ transform: `scaleX(${beat / 16})` }} />
      </div>
      <div className="demo-panel-meta">
        <span>Simulation · no real payments</span>
        <span className="demo-counter">{beat} / 16</span>
      </div>
      <div className="demo-narration-copy">
        <img src={`/clerk-hd/${mood}.webp`} width={48} height={48} alt="" />
        <p key={text} className="demo-type-on" aria-hidden="true">
          {text.slice(0, count)}
          <span className="demo-untyped">{text.slice(count)}</span>
        </p>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {text}
        </span>
      </div>
      <div className="demo-controls">
        <button type="button" onClick={onPause} aria-keyshortcuts="Space">
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={onNext}>
          Next
        </button>
        <button type="button" onClick={onExit} aria-keyshortcuts="Escape">
          Exit
        </button>
      </div>
    </section>
  );
}

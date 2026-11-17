"use client";
import { useEffect, useRef, useState } from "react";
import { Arrow } from "./brand";
import { InvoiceTheatre } from "./invoice-theatre";
const beats = [
  "Read the invoice",
  "Follow the address",
  "Compare every character",
  "Refuse the destination",
];
export function ClearingScene() {
  const root = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
      desktop = matchMedia("(min-width: 1024px) and (min-height: 880px)");
    let frame = 0;
    function render() {
      frame = 0;
      if (!el) return;
      if (reduced.matches) {
        el.style.setProperty("--p", "1");
        setPhase(3);
        return;
      }
      if (!desktop.matches) return;
      const rect = el.getBoundingClientRect();
      const p = Math.max(
        0,
        Math.min(1, -rect.top / (rect.height - innerHeight)),
      );
      el.style.setProperty("--p", String(p));
      setPhase(Math.min(3, Math.floor(p * 4)));
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(render);
    }
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
    };
  }, []);
  function choose(n: number) {
    const el = root.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const p = reduced ? 1 : n / 3;
    el.style.setProperty("--p", String(p));
    setPhase(reduced ? 3 : n);
    if (
      matchMedia("(min-width: 1024px) and (min-height: 880px)").matches &&
      !reduced
    )
      window.scrollTo({
        top:
          scrollY +
          el.getBoundingClientRect().top +
          p * (el.offsetHeight - innerHeight),
        behavior: "instant",
      });
  }
  return (
    <section
      className="clearing-sequence"
      ref={root}
      aria-label="Follow the poisoned sample invoice"
    >
      <div className="clearing-stage" data-phase={phase}>
        <div
          className="scene-tabs"
          role="group"
          aria-label="Sample clearing beats"
        >
          {beats.map((label, n) => (
            <button
              key={label}
              aria-pressed={phase === n}
              onClick={() => choose(n)}
            >
              {label}
            </button>
          ))}
        </div>
        <InvoiceTheatre phase={phase} shared />
        <div className="scene-caption">
          <span>Authored extraction sample. No live model called.</span>
          <a href="/attack">
            Take the attacker's seat <Arrow />
          </a>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { DESK_MOTION, gsap } from "./motion";
import { PillLink } from "./pill-link";

const steps = [
  {
    word: "Read",
    copy: "Clerk extracts the payee from any invoice, even a poisoned one.",
    list: ["TXT, CSV, PDF", "Live model", "Saved fallback"],
  },
  {
    word: "Compare",
    copy: "Every character of the address against the on-chain registry.",
    list: ["Exact name", "Full address", "24-hour hold"],
  },
  {
    word: "Refuse*",
    copy: "The contract pays only the verified destination.",
    list: ["Paid", "Rejected with reason", "Kill switch"],
  },
];

export function ProcessStory() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        const scope = root.current!;
        scope.dataset.animated = "true";
        const cards = scope.querySelectorAll<HTMLElement>(".process-paper");
        const words = scope.querySelectorAll<HTMLElement>(".process-word");
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: "+=280%",
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
          },
        });
        cards.forEach((card, index) => {
          timeline.fromTo(
            card,
            {
              y: () => window.innerHeight * 1.05,
              xPercent: index === 1 ? 20 : -20,
              rotate: index === 1 ? 9 : -8,
            },
            {
              y: () => -window.innerHeight * 1.05,
              xPercent: index === 1 ? -10 : 10,
              rotate: index === 1 ? -5 : 5,
              ease: "none",
              duration: 1,
            },
            index * 0.85,
          );
        });
        timeline
          .to(
            scope.querySelector(".process-words"),
            { yPercent: -35, scale: 0.8, duration: 0.45 },
            2.75,
          )
          .from(
            scope.querySelector(".process-last-word"),
            { y: 70, autoAlpha: 0, duration: 0.4 },
            2.8,
          );
        timeline.eventCallback("onUpdate", () => {
          const time = timeline.time();
          words.forEach((word, index) => {
            word.dataset.active = String(
              time >= index * 0.85 + 0.2 && time <= index * 0.85 + 0.8,
            );
          });
        });
        return () => {
          delete scope.dataset.animated;
          words.forEach((word) => {
            delete word.dataset.active;
          });
        };
      },
      root,
    );
    return () => media.revert();
  }, []);
  return (
    <section
      ref={root}
      className="process-story desk-texture"
      aria-labelledby="process-title"
    >
      <span className="eyebrow process-label">
        02 / THREE VERBS. ONE BOUNDARY.
      </span>
      <h2 id="process-title" className="process-words">
        {steps.map(({ word }) => (
          <span className="process-word" key={word}>
            <span>{word}</span>
            <em className="serif-accent" aria-hidden="true">
              {word}
            </em>
          </span>
        ))}
      </h2>
      <div className="process-papers">
        {steps.map((step, index) => (
          <article className="process-paper" key={step.word}>
            <span className="paper-number">
              0{index + 1} / CLEARING PROTOCOL
            </span>
            <h3>{step.word.replace("*", "")}.</h3>
            <p>{step.copy}</p>
            <ul>
              {step.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <span className="paper-corner">↗</span>
          </article>
        ))}
      </div>
      <div className="process-last-word">
        <p>
          <span>(</span>
          <span>
            The AI can be fooled.
            <br />
            The money can’t.
          </span>
          <span>)</span>
        </p>
        <PillLink href="/attack" primary>
          Test the boundary
        </PillLink>
        <small>*Refuse a mismatch. Pay a verified destination.</small>
      </div>
    </section>
  );
}

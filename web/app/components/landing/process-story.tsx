"use client";

import { Wallpaper } from "./wallpaper";
import { useEffect, useRef } from "react";
import { animateWallpaper, DESK_MOTION, gsap } from "./motion";
import { Letters } from "./letters";
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
            end: "+=380%",
            pin: true,
            scrub: 0.8,
          },
        });
        // The first word rises while the section scrolls in, so the screen is never empty.
        gsap.from(words[0].querySelectorAll(".word-plain .motion-letter"), {
          yPercent: 30,
          opacity: 0,
          stagger: 0.06,
          ease: "power1.out",
          scrollTrigger: {
            trigger: scope,
            start: "top 85%",
            end: "top 15%",
            scrub: 0.8,
          },
        });
        cards.forEach((card, index) => {
          const start = index * 2.1;
          const word = words[index];
          if (index > 0)
            timeline.from(
              word.querySelectorAll(".word-plain .motion-letter"),
              {
                yPercent: 30,
                opacity: 0,
                stagger: 0.06,
                duration: 0.45,
                ease: "power1.out",
              },
              start,
            );
          timeline
            .fromTo(
              card,
              {
                y: () => window.innerHeight * 1.05,
                xPercent: index === 1 ? 10 : -10,
                rotation: index === 1 ? 4 : -4,
              },
              {
                y: () => -window.innerHeight * 1.05,
                xPercent: index === 1 ? -5 : 5,
                rotation: index === 1 ? -2 : 2,
                ease: "power2.out",
                duration: 1.7,
              },
              start + 0.55,
            )
            // Each letter eases from white to the signal blue while its card passes.
            .fromTo(
              word.querySelectorAll(".word-plain .motion-letter"),
              { color: "#EEF3F8" },
              {
                color: "#00BFFF",
                stagger: 0.09,
                duration: 0.5,
                ease: "sine.inOut",
              },
              start + 0.7,
            );
        });
        timeline
          .to(
            scope.querySelector(".process-words"),
            { yPercent: -35, scale: 0.8, duration: 0.5 },
            6.5,
          )
          .from(
            scope.querySelector(".process-last-word"),
            { y: 70, opacity: 0, duration: 0.5 },
            6.6,
          );
        animateWallpaper(timeline, scope);
        return () => {
          delete scope.dataset.animated;
        };
      },
      root,
    );
    return () => media.revert();
  }, []);
  return (
    <section
      ref={root}
      className="process-story desk-texture photo-section"
      aria-labelledby="process-title"
    >
      <Wallpaper scene="steel" pinned />
      <h2
        id="process-title"
        className="process-words"
        aria-label="Read. Compare. Refuse."
      >
        {steps.map(({ word }) => (
          <span className="process-word" key={word} aria-hidden="true">
            <span className="word-plain" aria-hidden="true">
              <Letters text={word} />
            </span>
          </span>
        ))}
      </h2>
      <div className="process-papers">
        {steps.map((step) => (
          <article className="process-paper" key={step.word}>
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

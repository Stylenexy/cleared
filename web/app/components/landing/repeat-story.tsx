"use client";

import { useEffect, useRef } from "react";
import { DESK_MOTION, gsap } from "./motion";
import { storyStep } from "./story-progress";

export function RepeatStory() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        const scope = root.current!;
        const words = scope.querySelectorAll<HTMLElement>(".repeat-word");
        const slip = scope.querySelector<HTMLElement>(".stamp-slip")!;
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: "+=120%",
            pin: true,
            anticipatePin: 1,
            scrub: 0.7,
          },
        });
        for (let index = 0; index < 4; index++) {
          timeline
            .to(
              scope.querySelector(".stamp-object"),
              {
                y: 65,
                scaleY: 0.92,
                rotate: index % 2 ? 5 : -5,
                duration: 0.28,
                ease: "power2.in",
              },
              index,
            )
            .to(
              scope.querySelector(".stamp-object"),
              { y: 0, scaleY: 1, duration: 0.6, ease: "power2.out" },
              index + 0.3,
            );
        }
        timeline.eventCallback("onUpdate", () => {
          const step = storyStep(timeline.progress(), 4);
          words.forEach((word, index) => {
            word.dataset.active = String(index === step);
          });
          slip.dataset.status = step % 2 ? "refused" : "cleared";
        });
        return () => {
          words.forEach((word) => {
            delete word.dataset.active;
          });
          slip.dataset.status = "refused";
        };
      },
      root,
    );
    return () => media.revert();
  }, []);
  return (
    <section
      ref={root}
      className="repeat-story desk-texture"
      aria-labelledby="repeat-title"
    >
      <span className="eyebrow">03 / CONSISTENCY IS THE POINT</span>
      <h2 id="repeat-title">
        {["Read.", "Compare.", "Refuse.", "Every time."].map((word, index) => (
          <span className="repeat-word" data-final={index === 3} key={word}>
            <span>{word}</span>
            <em className="serif-accent" aria-hidden="true">
              {word}
            </em>
          </span>
        ))}
      </h2>
      <div className="stamp-stage" aria-hidden="true">
        <div className="stamp-slip" data-status="refused">
          <small>CLEARING DESK / SAMPLE</small>
          <strong className="stamp-cleared">CLEARED</strong>
          <strong className="stamp-refused">REFUSED</strong>
          <span>EXACT RULES. EVERY RUN.</span>
        </div>
        <img
          className="studio-object stamp-object"
          src="/objects/stamp.webp"
          width={720}
          height={824}
          alt=""
          loading="lazy"
        />
      </div>
      <p className="repeat-note">
        A verified destination is paid.
        <br />A mismatched destination is refused. Every time.
      </p>
    </section>
  );
}

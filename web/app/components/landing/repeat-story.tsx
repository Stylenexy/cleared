"use client";

import { useEffect, useRef } from "react";
import { DESK_MOTION, gsap } from "./motion";
import { Letters } from "./letters";

export function RepeatStory() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        const scope = root.current!;
        const words = scope.querySelectorAll<HTMLElement>(".repeat-word");
        const slips = scope.querySelectorAll<HTMLElement>(".stamp-slip");
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: "+=240%",
            pin: true,
            scrub: 0.7,
          },
        });
        for (let index = 0; index < 4; index++) {
          const start = index * 1.5;
          const slip = slips[index];
          timeline
            .from(
              words[index].querySelectorAll(".word-plain .motion-letter"),
              {
                yPercent: 110,
                opacity: 0,
                stagger: 0.035,
                duration: 0.22,
              },
              start,
            )
            .from(
              slip,
              {
                x: 500,
                rotation: 8,
                opacity: 0,
                duration: 0.45,
                ease: "power2.out",
              },
              start + 0.2,
            )
            .fromTo(
              words[index].querySelectorAll(".word-plain .motion-letter"),
              { color: "#EEF3F8" },
              {
                color: "#00BFFF",
                stagger: 0.05,
                duration: 0.3,
                ease: "sine.inOut",
              },
              start + 0.6,
            )
            .from(
              slip.querySelector("strong"),
              { scale: 1.4, opacity: 0, duration: 0.12 },
              start + 0.8,
            )
            .to(
              scope.querySelector(".stamp-stage"),
              { x: 3, y: 2, repeat: 3, yoyo: true, duration: 0.025 },
              start + 0.8,
            )
            .to(
              scope.querySelector(".stamp-stage"),
              { x: 0, y: 0, duration: 0.05 },
              start + 0.9,
            )
            .to(
              slip,
              {
                x: -320,
                y: 25 + index * 7,
                scale: 0.72,
                rotation: -12 + index * 5,
                duration: 0.4,
              },
              start + 1.1,
            );
          slip
            .querySelectorAll<HTMLElement>(".ink-particle")
            .forEach((particle, n) => {
              const angle = (n * Math.PI) / 4;
              timeline
                .fromTo(
                  particle,
                  { x: 0, y: 0, scale: 0.2, opacity: 0 },
                  {
                    x: Math.cos(angle) * 95,
                    y: Math.sin(angle) * 65,
                    scale: 1,
                    opacity: 1,
                    duration: 0.12,
                  },
                  start + 0.8,
                )
                .to(
                  particle,
                  { opacity: 0, scale: 0.4, duration: 0.25 },
                  start + 0.92,
                );
            });
          timeline
            .to(
              scope.querySelector(".stamp-object"),
              {
                y: 65,
                scaleY: 0.88,
                scaleX: 1.06,
                rotate: index % 2 ? 3 : -3,
                duration: 0.18,
                ease: "power2.in",
              },
              start + 0.62,
            )
            .to(
              scope.querySelector(".stamp-object"),
              { y: 0, scaleY: 1, scaleX: 1, duration: 0.3, ease: "power2.out" },
              start + 0.82,
            );
        }
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
      <h2 id="repeat-title" aria-label="Read. Compare. Refuse. Every time.">
        {["Read.", "Compare.", "Refuse.", "Every time."].map((word) => (
          <span className="repeat-word" key={word} aria-hidden="true">
            <span className="word-plain" aria-hidden="true">
              <Letters text={word} />
            </span>
          </span>
        ))}
      </h2>
      <div className="stamp-stage" aria-hidden="true">
        <div className="contact-shadow" />
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="stamp-slip"
            data-status={index % 2 ? "refused" : "cleared"}
            key={index}
          >
            <strong className={index % 2 ? "stamp-refused" : "stamp-cleared"}>
              {index % 2 ? "REFUSED" : "CLEARED"}
            </strong>
            <span>
              {index % 2 ? "Destination mismatch" : "Verified destination"}
            </span>
            {Array.from({ length: 8 }, (_, n) => (
              <i className="ink-particle" key={n} />
            ))}
          </div>
        ))}
        <img
          className="studio-object stamp-object"
          src="/objects/stamp.webp"
          width={720}
          height={824}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
      <p className="repeat-note">
        A verified destination is paid.
        <br />A mismatched destination is refused. Every time.
      </p>
    </section>
  );
}

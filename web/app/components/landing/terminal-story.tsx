"use client";

import { Wallpaper } from "./wallpaper";
import { useEffect, useRef } from "react";
import screen from "../../../public/objects/terminal-screen.json";
import { animateWallpaper, DESK_MOTION, gsap } from "./motion";
import { Letters } from "./letters";

export const TERMINAL_LINES = [
  "Invoice NDS-0142",
  "read invoice… ok",
  "pay_to 0x166F5022…1d5A",
  "registry[Northwind]",
  "0x166F4C0F…1d5A",
  "compare 42 chars… 30 differ",
  "> REFUSED · name mismatch",
] as const;

export { PixelTiles } from "./pixel-tiles";
import { PixelTiles } from "./pixel-tiles";

export function TerminalStory() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        const scope = root.current!;
        const letters = scope.querySelectorAll<HTMLElement>(
          ".terminal-screen .motion-letter",
        );
        const object = scope.querySelector(".terminal-object");
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: () =>
              `+=${window.innerHeight * (window.innerWidth < 768 ? 0.8 : 2)}`,
            pin: true,
            scrub: 0.8,
          },
        });
        timeline
          .fromTo(
            object,
            { rotate: -6, scale: 0.91 },
            { rotate: 4, scale: 1, duration: 0.84, ease: "none" },
            0,
          )
          .to(
            object,
            {
              yPercent: -160,
              rotation: -7,
              opacity: 0,
              duration: 0.16,
              ease: "power2.in",
            },
            0.84,
          );
        timeline.from(
          letters,
          {
            opacity: 0,
            duration: 0.001,
            stagger: 0.74 / Math.max(1, letters.length),
            ease: "none",
          },
          0.04,
        );
        animateWallpaper(timeline, scope);
      },
      root,
    );
    return () => media.revert();
  }, []);
  return (
    <section
      className="terminal-story desk-texture photo-section"
      ref={root}
      aria-labelledby="terminal-title"
    >
      <Wallpaper scene="desk" pinned />
      <div className="story-kicker">
        <h2 id="terminal-title">
          Looks familiar.
          <br />
          Isn’t <em className="serif-accent">verified</em>.
        </h2>
      </div>
      <PixelTiles />
      <div className="terminal-object">
        <div className="contact-shadow" aria-hidden="true" />
        <img
          className="studio-object"
          src="/objects/terminal.webp"
          width={1095}
          height={928}
          alt="A cyan-lit clearing terminal inspecting an illustrated poisoned invoice."
          loading="lazy"
          decoding="async"
        />
        <div
          className="terminal-screen"
          aria-hidden="true"
          style={{
            left: `${screen.left}%`,
            top: `${screen.top}%`,
            width: `${screen.width}%`,
            height: `${screen.height}%`,
            transform: `rotate(${screen.rotation}deg)`,
          }}
        >
          {TERMINAL_LINES.map((line, index) => (
            <span
              key={line}
              className={
                index === TERMINAL_LINES.length - 1 ? "terminal-refused" : ""
              }
            >
              <Letters text={line} />
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only">Illustrated sample: {TERMINAL_LINES.join(". ")}</p>
      <div className="story-caption">
        <p>
          The first six. The last four.
          <br />
          The contract checks everything in between.
        </p>
      </div>
    </section>
  );
}

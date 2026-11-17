"use client";

import { useEffect, useRef } from "react";
import { DESK_MOTION, gsap } from "./motion";
import { Wallpaper } from "./wallpaper";
import { typingTimeline } from "../../../lib/landing-animation";

const GREETING = ["Hi, I'm Clerk.", "I check every payment before it leaves."];

export function ClerkIntro() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        const scope = root.current!;
        scope.dataset.animated = "true";
        const lines = scope.querySelectorAll<HTMLElement>(".clerk-speech p");
        const clock = { elapsed: 0 };
        const typing = gsap.to(clock, {
          elapsed: 5200,
          duration: 5.2,
          ease: "none",
          repeat: -1,
          onUpdate: () =>
            typingTimeline(GREETING, clock.elapsed, 2600, 2600).forEach(
              (line, index) => {
                if (lines[index].textContent !== line)
                  lines[index].textContent = line;
              },
            ),
        });
        const bob = gsap.to(".intro-clerk-hi", {
          y: -12,
          duration: 2.5,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: "+=150%",
            pin: true,
            scrub: 0.8,
            onToggle: ({ isActive }) => {
              typing.paused(!isActive);
              bob.paused(!isActive);
            },
          },
        });
        timeline
          .to(
            ".clerk-speech, .intro-scroll",
            { opacity: 0, duration: 0.2 },
            0.1,
          )
          .to(".intro-clerk-hi", { opacity: 0, duration: 0.2 }, 0.25)
          .fromTo(
            ".intro-clerk-present",
            { opacity: 0 },
            { opacity: 1, duration: 0.2 },
            0.25,
          )
          .to(
            ".intro-camera",
            { scale: 3.6, yPercent: 24, duration: 0.6, ease: "power2.in" },
            0.4,
          )
          .fromTo(
            ".intro-card-flash",
            { scale: 0.08, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.2 },
            0.8,
          )
          .to(".intro-card-flash", { opacity: 0, duration: 0.16 }, 1.02)
          .to(".intro-camera", { opacity: 0, duration: 0.16 }, 1.02)
          .to(scope, { opacity: 0, duration: 0.16 }, 1.02);
        return () => {
          delete scope.dataset.animated;
          lines.forEach((line, index) => {
            line.textContent = GREETING[index];
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
      className="clerk-intro photo-section"
      aria-label="Meet Clerk"
    >
      <Wallpaper scene="hero" pinned />
      <div className="intro-camera">
        <div className="intro-clerk">
          <div className="contact-shadow" />
          <img
            className="intro-clerk-hi"
            src="/clerk-hd/hi.webp"
            width={805}
            height={1100}
            alt="Clerk welcomes you to the vault."
            decoding="async"
            loading="eager"
            fetchPriority="high"
            onError={(event) => {
              if (
                event.currentTarget.getAttribute("src") !==
                "/clerk-hd/wave.webp"
              ) {
                event.currentTarget.width = 767;
                event.currentTarget.src = "/clerk-hd/wave.webp";
              }
            }}
          />
          <img
            className="intro-clerk-present"
            src="/clerk-hd/present.webp"
            width={665}
            height={1100}
            alt=""
            decoding="async"
            loading="eager"
            fetchPriority="low"
            onError={(event) => {
              if (
                event.currentTarget.getAttribute("src") !==
                "/clerk-hd/read.webp"
              ) {
                event.currentTarget.width = 677;
                event.currentTarget.src = "/clerk-hd/read.webp";
              }
            }}
          />
        </div>
        <div
          className="clerk-speech"
          role="group"
          aria-label={GREETING.join(" ")}
        >
          {GREETING.map((line) => (
            <p key={line} aria-hidden="true">
              {line}
            </p>
          ))}
          <i className="speech-caret" aria-hidden="true" />
        </div>
      </div>
      <div className="intro-card-flash" aria-hidden="true" />
      <div className="intro-scroll" aria-hidden="true">
        <span>Scroll</span>
        <i />
      </div>
    </section>
  );
}

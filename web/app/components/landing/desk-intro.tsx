"use client";

import { Wallpaper } from "./wallpaper";
import { useEffect, useRef, useState } from "react";
import { Clerk } from "./clerk";
import { DESK_MOTION, gsap } from "./motion";
import { PillLink } from "./pill-link";
import { typingTimeline } from "../../../lib/landing-animation";
import { Letters } from "./letters";

const CHECK = ["check 0x166F5022…1d5A", "→ Name mismatch"];

export function DeskIntro() {
  const root = useRef<HTMLDivElement>(null);
  const [frozen, setFrozen] = useState(false);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        const scope = root.current!;
        gsap.from(scope.querySelector(".desk-widgets"), {
          y: 120,
          ease: "none",
          scrollTrigger: {
            trigger: scope.querySelector(".desk-widgets"),
            start: "top bottom",
            end: "top 25%",
            scrub: 0.8,
          },
        });
        gsap.fromTo(
          scope.querySelector(".hold-hand"),
          { rotation: -160 },
          {
            rotation: 0,
            transformOrigin: "50% 72px",
            ease: "none",
            scrollTrigger: {
              trigger: scope.querySelector(".desk-widgets"),
              start: "top 85%",
              end: "bottom 35%",
              scrub: 0.8,
            },
          },
        );
        const terminal =
          scope.querySelectorAll<HTMLElement>(".mini-output span");
        const clock = { elapsed: 0 };
        const typing = gsap.to(clock, {
          elapsed: 3400,
          duration: 3.4,
          repeat: -1,
          paused: true,
          ease: "none",
          onUpdate: () =>
            typingTimeline(CHECK, clock.elapsed).forEach((line, index) => {
              if (terminal[index].textContent !== line)
                terminal[index].textContent = line;
            }),
        });
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.intersectionRatio >= 0.3) typing.restart();
            else typing.pause();
          },
          { threshold: 0.3 },
        );
        observer.observe(scope.querySelector(".mini-terminal")!);
        gsap.from(scope.querySelectorAll(".hero-letter .motion-letter"), {
          yPercent: 110,
          opacity: 0,
          stagger: 0.025,
          duration: 0.65,
          ease: "power2.out",
          scrollTrigger: {
            trigger: scope.querySelector(".signal-hero"),
            start: "top 65%",
            once: true,
          },
        });
        return () => {
          observer.disconnect();
          terminal.forEach((line, index) => {
            line.textContent = CHECK[index];
          });
        };
      },
      root,
    );
    return () => media.revert();
  }, []);
  return (
    <div ref={root} className="desk-intro">
      <section
        className="signal-hero desk-texture photo-section"
        aria-labelledby="hero-title"
      >
        <Wallpaper scene="hero" />
        <h1
          id="hero-title"
          aria-label="Let your agent pay. Keep the last word."
        >
          <span className="hero-line" aria-hidden="true">
            {["Let", "your", "agent"].map((word) => (
              <span className="hero-letter" key={word}>
                <Letters text={word} />
              </span>
            ))}
            <em className="serif-accent hero-letter">
              <Letters text="pay." />
            </em>
          </span>
          <span className="hero-line" aria-hidden="true">
            {["Keep", "the"].map((word) => (
              <span className="hero-letter" key={word}>
                <Letters text={word} />
              </span>
            ))}
            <em className="serif-accent hero-letter">
              <Letters text="last word." />
            </em>
          </span>
        </h1>
        <div className="hero-actions">
          <PillLink href="/attack" primary>
            Open the attack lab
          </PillLink>
          <a className="hero-quiet-link" href="/try">
            or try three invoices →
          </a>
        </div>
      </section>
      <section className="desk-widgets" aria-labelledby="widgets-title">
        <div className="widget-intro">
          <div className="clerk-avatar">
            <Clerk pose="wave" />
          </div>
          <div>
            <h2 id="widgets-title">Clerk, your clearing clerk.</h2>
            <p>Reads the invoice. Leaves the final say to the contract.</p>
          </div>
        </div>
        <div className="widget-grid">
          <article className="desk-widget">
            <div className="widget-face switch-face">
              <button
                type="button"
                role="switch"
                aria-checked={frozen}
                aria-label="Preview the kill switch"
                className="kill-toggle"
                onClick={() => setFrozen(!frozen)}
              >
                <span>{frozen ? "ON" : "OFF"}</span>
                <i />
              </button>
              <span
                className={frozen ? "widget-status frozen" : "widget-status"}
              >
                {frozen
                  ? "FROZEN · OWNER CONTROL"
                  : "ACTIVE · PAYMENTS ENABLED"}
              </span>
            </div>
            <h3>One switch. Every agent payment.</h3>
            <p role="status">
              {frozen
                ? "Every agent payment frozen"
                : "Freeze the entire payment circuit in a single tap."}
            </p>
            <small>Interactive preview · no transaction</small>
          </article>
          <article className="desk-widget">
            <div className="widget-face">
              <div className="hold-dial">
                <div className="dial-ticks" />
                <i className="hold-hand" />
                <strong>
                  24<span>HOURS</span>
                </strong>
              </div>
            </div>
            <h3>A new address can wait.</h3>
            <p>
              New or changed payees get a 24-hour hold before an agent can pay.
            </p>
          </article>
          <article className="desk-widget">
            <div className="widget-face mini-terminal">
              <div className="mini-output" aria-hidden="true">
                {CHECK.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
              <span className="sr-only">Check address. Name mismatch.</span>
              <span className="terminal-caret" />
            </div>
            <h3>Every character gets a vote.</h3>
            <p>
              A familiar beginning and ending don’t make it the right
              destination.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}

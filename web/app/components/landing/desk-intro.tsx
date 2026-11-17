"use client";

import { Wallpaper } from "./wallpaper";
import { useEffect, useRef, useState } from "react";
import { Clerk } from "./clerk";
import { DESK_MOTION, gsap } from "./motion";
import { PillLink } from "./pill-link";
import { typedLines } from "./story-progress";

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
        gsap.to(
          {},
          {
            scrollTrigger: {
              trigger: scope.querySelector(".desk-widgets"),
              start: "top 80%",
              end: "bottom 55%",
              scrub: 0.7,
              onUpdate: (self) =>
                typedLines(CHECK, self.progress).forEach((line, index) => {
                  terminal[index].textContent = line;
                }),
            },
          },
        );
        const tiles = scope.querySelectorAll<HTMLElement>(".preview-tile");
        const shifts = Array.from(tiles, (tile) => ({
          x: gsap.quickTo(tile, "x", { duration: 0.7 }),
          y: gsap.quickTo(tile, "y", { duration: 0.7 }),
        }));
        const strip = scope.querySelector<HTMLElement>(".preview-strip")!;
        let drag:
          { pointer: number; start: number; scroll: number } | undefined;
        const resize = new ResizeObserver(() => {
          strip.dataset.cursor =
            strip.scrollWidth > strip.clientWidth ? "Drag" : "View";
        });
        resize.observe(strip);
        const down = (event: PointerEvent) => {
          if (event.button !== 0 || strip.scrollWidth <= strip.clientWidth)
            return;
          drag = {
            pointer: event.pointerId,
            start: event.clientX,
            scroll: strip.scrollLeft,
          };
          strip.setPointerCapture(event.pointerId);
        };
        const up = () => {
          drag = undefined;
        };
        const move = (event: PointerEvent) => {
          if (drag) {
            strip.scrollLeft = drag.scroll + drag.start - event.clientX;
            return;
          }
          const bounds = strip.getBoundingClientRect();
          shifts.forEach((shift, index) => {
            const depth = ((index % 3) + 1) * 5;
            shift.x(
              ((event.clientX - bounds.left) / bounds.width - 0.5) * depth,
            );
            shift.y(
              ((event.clientY - bounds.top) / bounds.height - 0.5) * depth,
            );
          });
        };
        const leave = () =>
          shifts.forEach((shift) => {
            shift.x(0);
            shift.y(0);
          });
        strip.addEventListener("pointermove", move, { passive: true });
        strip.addEventListener("pointerleave", leave);
        strip.addEventListener("pointerdown", down);
        strip.addEventListener("pointerup", up);
        strip.addEventListener("pointercancel", up);
        strip.addEventListener("lostpointercapture", up);
        return () => {
          if (drag && strip.hasPointerCapture(drag.pointer))
            strip.releasePointerCapture(drag.pointer);
          resize.disconnect();
          strip.removeEventListener("pointerdown", down);
          strip.removeEventListener("pointerup", up);
          strip.removeEventListener("pointercancel", up);
          strip.removeEventListener("lostpointercapture", up);
          strip.removeEventListener("pointermove", move);
          strip.removeEventListener("pointerleave", leave);
          shifts.forEach((shift) => {
            shift.x.tween.kill();
            shift.y.tween.kill();
          });
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
        <div className="hero-meta">
          <span className="eyebrow">THE CLEARING DESK / 001</span>
          <span>
            <i className="signal-live" />
            Live on Aevum testnet
            <br />
            <small>CHAIN 44005 · CONTRACT-ENFORCED</small>
          </span>
        </div>
        <h1 id="hero-title">
          Let your agent <em className="serif-accent">pay</em> —<br />
          the contract keeps
          <br />
          the <em className="serif-accent">last word</em>.
        </h1>
        <div className="hero-under">
          <p>
            Invoices in. Verified payments out.
            <br />A clearing desk for your treasury’s agent.
          </p>
          <div className="desk-actions">
            <PillLink href="/attack" primary>
              Open the attack lab
            </PillLink>
            <PillLink href="/try">Try three invoices</PillLink>
          </div>
        </div>
        <div
          className="preview-strip"
          data-cursor="Drag"
          aria-label="Illustrated product previews"
        >
          <div className="preview-tile preview-invoice">
            <small>INVOICE / NDS-0142</small>
            <strong>
              Northwind
              <br />
              Design Studio
            </strong>
            <hr />
            <span>Brand system sprint</span>
            <span>Motion assets</span>
          </div>
          <div className="preview-tile preview-registry">
            <small>REGISTRY MATCH</small>
            <span className="preview-check">↳</span>
            <strong>Name-exact.</strong>
            <code>0x166F4C0F…1d5A</code>
          </div>
          <div className="preview-tile preview-refusal">
            <span>Sample decision</span>
            <strong>REFUSED</strong>
            <small>NAME MISMATCH</small>
          </div>
          <div className="preview-tile preview-ledger">
            <small>LEDGER / SAMPLE ROW</small>
            <span>↗ Rejected</span>
            <code>NameMismatch</code>
            <i>Recorded on-chain</i>
          </div>
          <div className="preview-tile preview-switch">
            <small>OWNER CONTROLS</small>
            <span className="mini-switch" />
            <strong>One tap. Frozen.</strong>
          </div>
          <div className="preview-tile preview-clerk">
            <Clerk pose="read" eager />
            <span>Meet Clerk ↗</span>
          </div>
        </div>
        <div className="hero-footnote">
          <span>Illustrated samples · real rules</span>
          <span>SCROLL TO CHECK THE FINE PRINT ↓</span>
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
          <span className="eyebrow">SMALL INTERFACE. HARD BOUNDARY.</span>
        </div>
        <div className="widget-grid">
          <article className="desk-widget">
            <div className="widget-face switch-face">
              <span className="eyebrow">PAYMENT CIRCUIT</span>
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
              <span className="eyebrow">TIME TO DOUBLE-CHECK</span>
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
              <span className="eyebrow">REGISTRY.EXACT_MATCH()</span>
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

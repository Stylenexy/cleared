"use client";

import { Wallpaper } from "./wallpaper";
import { useEffect, useRef } from "react";
import { animateWallpaper, DESK_MOTION, gsap } from "./motion";
import { PillLink } from "./pill-link";
import { PixelTiles } from "./terminal-story";

export function FooterStory() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        const scope = root.current!;
        scope.dataset.animated = "true";
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: "+=180%",
            pin: true,
            anticipatePin: 1,
            scrub: 0.8,
          },
        });
        timeline
          .fromTo(
            scope.querySelector(".printed-receipt"),
            { yPercent: 45 },
            {
              yPercent: -35,
              duration: 1,
              ease: "none",
            },
            0,
          )
          .to(
            scope.querySelector(".printer-image"),
            { yPercent: 130, autoAlpha: 0, duration: 0.7 },
            1,
          )
          .to(
            scope.querySelector(".footer-story-copy"),
            { y: -100, autoAlpha: 0, duration: 0.6 },
            1.1,
          )
          .to(
            scope.querySelector(".printed-receipt"),
            { xPercent: -150, yPercent: 25, rotation: -13, duration: 0.8 },
            1.35,
          )
          .from(
            scope.querySelector(".footer-clerk-sticker"),
            {
              y: -500,
              rotation: 26,
              autoAlpha: 0,
              duration: 0.8,
              ease: "power3.out",
            },
            1.35,
          )
          .from(
            scope.querySelector(".conviction-sticker"),
            {
              y: 500,
              rotation: -20,
              autoAlpha: 0,
              duration: 0.8,
              ease: "power3.out",
            },
            1.5,
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
      className="footer-story desk-texture photo-section"
      ref={root}
      aria-labelledby="start-title"
    >
      <Wallpaper scene="colonnade" pinned />
      <PixelTiles />
      <div className="footer-story-copy">
        <h2 id="start-title">
          Getting
          <br />
          started is
          <br />
          <em className="serif-accent">simple</em>.
        </h2>
        <p>
          Bring an invoice. Try a poisoned address.
          <br />
          Watch where the money stops.
        </p>
        <div className="desk-actions">
          <PillLink href="/attack" primary>
            Open the attack lab
          </PillLink>
          <PillLink href="https://github.com/Stylenexy/cleared#readme" external>
            Read the README
          </PillLink>
        </div>
      </div>
      <div className="printer-assembly">
        <div className="contact-shadow" aria-hidden="true" />
        <div className="printed-receipt">
          <span>ILLUSTRATED SAMPLE</span>
          <strong>CLEARED RECEIPT</strong>
          <hr />
          <dl>
            <dt>vault</dt>
            <dd>0x8fba…d13c</dd>
            <dt>payee</dt>
            <dd>
              Northwind
              <br />
              Design Studio
            </dd>
            <dt>status</dt>
            <dd>verified</dd>
            <dt>chain</dt>
            <dd>44005</dd>
          </dl>
          <div className="receipt-barcode" />
          <small>THE DESTINATION IS THE DECISION.</small>
        </div>
        <img
          className="studio-object printer-image"
          src="/objects/printer.webp"
          width={1058}
          height={794}
          alt="A clearing desk printer issuing an illustrated verified payee receipt."
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="footer-clerk-sticker">
        <div className="contact-shadow" aria-hidden="true" />
        <img
          src="/objects/clerk-sticker.webp"
          width={685}
          height={859}
          alt="Clerk gives the verified destination a thumbs up."
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="conviction-sticker">
        <strong>
          AI CAN
          <br />
          BE FOOLED.
        </strong>
        <em>
          MONEY
          <br />
          CAN’T.
        </em>
        <span>ENFORCED BY CONTRACT ↗</span>
      </div>
    </section>
  );
}

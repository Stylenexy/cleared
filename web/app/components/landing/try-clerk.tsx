"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { KOPI_PAGI, KOPI_PAGI_LOOKALIKES } from "../../../lib/sample-addresses";
import { PillLink } from "./pill-link";
import { AddressComparison } from "./address-comparison";
import { compareAddress, poisonAddress } from "./address-diff";
import { Clerk } from "./clerk";
import { DESK_MOTION, gsap } from "./motion";

const poses = ["scan", "refuse", "cheer", "stand"] as const;

export function TryClerk() {
  const root = useRef<HTMLElement>(null);
  const [reaction, setReaction] = useState(0);
  const [address, setAddress] = useState<string>(KOPI_PAGI_LOOKALIKES[0]);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        const scope = root.current!;
        gsap
          .timeline({
            scrollTrigger: { trigger: scope, start: "top 70%", once: true },
          })
          .from(scope.querySelector(".play-dim"), {
            opacity: 0.85,
            duration: 0.7,
          })
          .from(
            scope.querySelector(".play-intro"),
            { scale: 0.5, opacity: 0, duration: 0.5, ease: "power2.out" },
            0,
          )
          .from(
            scope.querySelector(".try-clerk-character"),
            { y: -350, opacity: 0, duration: 1, ease: "bounce.out" },
            0.25,
          )
          .fromTo(
            scope.querySelector(".play-border"),
            { opacity: 0 },
            { opacity: 0.9, duration: 0.35, repeat: 1, yoyo: true },
            0.6,
          )
          .from(
            scope.querySelector(".input-hint"),
            { x: -15, opacity: 0, duration: 0.5 },
            0.8,
          );
      },
      root,
    );
    return () => media.revert();
  }, []);
  const comparison = compareAddress(address, KOPI_PAGI);
  const pose = typing
    ? "scan"
    : !comparison.valid
      ? "stand"
      : comparison.matches
        ? "cheer"
        : "refuse";
  const message = typing
    ? "Checking every character…"
    : !comparison.valid
      ? "Enter a 0x address followed by 40 hexadecimal characters."
      : comparison.matches
        ? "Cleared. This is the registered address."
        : `Refused. ${comparison.differences} characters differ from the registered address.`;
  function update(value: string, isTyping = false) {
    clearTimeout(timer.current);
    setAddress(value);
    setTyping(isTyping);
    setReaction((value) => value + 1);
    if (isTyping) timer.current = setTimeout(() => setTyping(false), 420);
  }
  return (
    <section
      ref={root}
      className="try-clerk"
      aria-labelledby="try-clerk-title"
      data-result={pose}
    >
      <div className="play-dim" aria-hidden="true" />
      <div className="play-border" aria-hidden="true" />
      <p className="play-intro">Your move.</p>
      <div className="try-clerk-character" aria-hidden="true">
        <div className="contact-shadow" />
        {poses.map((item) => (
          <div
            key={item}
            className="try-clerk-pose"
            data-active={pose === item}
          >
            <Clerk pose={item} />
          </div>
        ))}
        <div className="clerk-reaction" key={`${pose}-${reaction}`}>
          {pose === "refuse" && <span className="shield-flash">×</span>}
          {pose === "cheer" &&
            Array.from({ length: 16 }, (_, index) => (
              <i
                className="clerk-confetti"
                key={index}
                style={{ "--n": index } as CSSProperties}
              />
            ))}
        </div>
      </div>
      <div className="try-clerk-content">
        <h2 id="try-clerk-title">
          Try to <em className="serif-accent">fool</em> Clerk.
        </h2>
        <p className="registered-address">
          Registered to Northwind Design Studio<code>{KOPI_PAGI}</code>
        </p>
        <label htmlFor="clerk-address">
          <span className="input-hint" aria-hidden="true">
            ↳
          </span>{" "}
          Payment destination
        </label>
        <input
          id="clerk-address"
          type="text"
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          maxLength={42}
          value={address}
          onChange={(event) => update(event.target.value, true)}
          aria-describedby="clerk-verdict clerk-preview-note"
          aria-invalid={!comparison.valid}
        />
        <AddressComparison registered={KOPI_PAGI} candidate={address} />
        <p
          id="clerk-verdict"
          className="clerk-verdict"
          data-state={pose}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
        <div className="try-clerk-actions">
          <button
            type="button"
            className="button play-button poison-button"
            data-cursor="Play"
            onClick={() => update(poisonAddress(KOPI_PAGI, address))}
          >
            Poison the address
            <span className="button-sparks" key={reaction} aria-hidden="true">
              ✦
            </span>
          </button>
          <button
            type="button"
            className="button play-button real-button"
            data-cursor="Play"
            onClick={() => update(KOPI_PAGI)}
          >
            <span aria-hidden="true">✓</span> Use the real address
          </button>
        </div>
        <PillLink href="/attack" primary>
          Open the full attack lab
        </PillLink>
        <p id="clerk-preview-note" className="clerk-preview-note">
          Local preview of the registry rule. The attack lab runs a live model
          and reads the Aevum contract.
        </p>
      </div>
    </section>
  );
}

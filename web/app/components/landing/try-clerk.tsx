"use client";

import { useEffect, useRef, useState } from "react";
import { KOPI_PAGI, KOPI_PAGI_LOOKALIKES } from "../../../lib/sample-addresses";
import { PillLink } from "./pill-link";
import { AddressComparison } from "./address-comparison";
import { compareAddress, poisonAddress } from "./address-diff";
import { Clerk } from "./clerk";

const poses = ["scan", "refuse", "cheer", "stand"] as const;

export function TryClerk() {
  const [address, setAddress] = useState<string>(KOPI_PAGI_LOOKALIKES[0]);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
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
    if (isTyping) timer.current = setTimeout(() => setTyping(false), 420);
  }
  return (
    <section className="try-clerk" aria-labelledby="try-clerk-title">
      <div className="try-clerk-character" aria-hidden="true">
        {poses.map((item) => (
          <div
            key={item}
            className="try-clerk-pose"
            data-active={pose === item}
          >
            <Clerk pose={item} />
          </div>
        ))}
      </div>
      <div className="try-clerk-content">
        <span className="eyebrow">YOUR TURN / LOCAL PREVIEW</span>
        <h2 id="try-clerk-title">
          Try to <em className="serif-accent">fool</em> Clerk.
        </h2>
        <p className="registered-address">
          Registered to Northwind Design Studio<code>{KOPI_PAGI}</code>
        </p>
        <label htmlFor="clerk-address">Payment destination</label>
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
            className="button landing-secondary"
            onClick={() => update(poisonAddress(KOPI_PAGI, address))}
          >
            Poison it
          </button>
          <button
            type="button"
            className="button landing-secondary"
            onClick={() => update(KOPI_PAGI)}
          >
            Use the real address
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

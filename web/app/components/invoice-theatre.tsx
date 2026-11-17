"use client";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import {
  attackText,
  lookalikes,
  verifiedAddress,
} from "../../lib/attack-samples";
import { DecisionStamp } from "./clearing-flow";

export function PaperGrain() {
  const id = useId();
  return (
    <svg className="paper-grain" aria-hidden="true" width="100%" height="100%">
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency=".8"
          numOctaves="3"
          seed="7"
          stitchTiles="stitch"
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} opacity=".04" />
    </svg>
  );
}

export function ComparedAddress({
  address,
  against,
  active = true,
}: {
  address: string;
  against: string;
  active?: boolean;
}) {
  return (
    <code className="compared-address" aria-label={address}>
      {Array.from(address).map((c, n) => (
        <span
          key={n}
          className={active && c !== against[n] ? "changed-digit" : undefined}
        >
          {c}
        </span>
      ))}
    </code>
  );
}

export function InvoiceTheatre({
  phase,
  text = attackText(lookalikes[0], true),
  destination = lookalikes[0],
  xray = false,
  editing = false,
  busy = false,
  onEdit,
  rejected = true,
  stamped = phase === 3,
  registry,
  shared = false,
}: {
  phase: number;
  text?: string;
  destination?: string;
  xray?: boolean;
  editing?: boolean;
  busy?: boolean;
  onEdit?: (text: string) => void;
  rejected?: boolean;
  stamped?: boolean;
  registry?: ReactNode;
  shared?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    source = useRef<HTMLSpanElement>(null),
    target = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = root.current,
      first = source.current,
      last = target.current;
    if (!el || !first || !last) return;
    // FLIP: measure the two resting slots; animate only the chip's transform.
    function measure() {
      const a = first!.getBoundingClientRect(),
        b = last!.getBoundingClientRect();
      el!.style.setProperty("--flight-x", `${a.left - b.left}px`);
      el!.style.setProperty("--flight-y", `${a.top - b.top}px`);
      el!.style.setProperty(
        "--flight-scale",
        String(a.width / Math.max(1, b.width)),
      );
      el!.style.setProperty(
        "--flight-scale-y",
        String(a.height / Math.max(1, b.height)),
      );
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(first);
    observer.observe(last);
    measure();
    return () => observer.disconnect();
  }, [editing, text, destination]);
  const hiddenText = [...text.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((m) => m[1])
    .join("\n");
  const visibleText = text
    .replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, "")
    .trim();
  return (
    <div
      className="clearing-theatre"
      data-phase={phase}
      data-rejected={rejected}
      ref={root}
    >
      <div className="document-stack">
        <div className="stack-sheet" aria-hidden="true" />
        <article
          className="clearing-document"
          data-xray={xray}
          style={
            shared ? { viewTransitionName: "clearing-document" } : undefined
          }
        >
          <PaperGrain />
          <div className="document-top">
            <span>Contractor invoice</span>
            <span>Sample</span>
          </div>
          {editing ? (
            <label className="source-editor">
              Invoice text
              <textarea
                aria-label="Invoice text"
                rows={13}
                maxLength={20000}
                value={text}
                disabled={busy}
                onChange={(e) => onEdit?.(e.target.value)}
              />
            </label>
          ) : (
            <>
              <h3>{text.match(/^Name:\s*(.+)$/m)?.[1] ?? "Invoice"}</h3>
              <div className="document-amount">
                {text.match(/^Amount:\s*(.+)$/m)?.[1] ?? "Review"}{" "}
                <span>tUSD8</span>
              </div>
              <pre className="invoice-copy">{visibleText}</pre>
              {hiddenText && (
                <div
                  className="injected-text"
                  aria-hidden={!xray && phase === 0}
                >
                  <span>Hidden instruction</span>
                  {hiddenText}
                </div>
              )}
            </>
          )}
          <span className="source-address">
            <span ref={source}>
              <ComparedAddress
                address={destination}
                against={verifiedAddress}
                active={false}
              />
            </span>
          </span>
          <p className="document-caption">
            Sample document. No transaction sent.
          </p>
          {stamped && (
            <div className="scene-stamp">
              <DecisionStamp rejected={rejected} />
            </div>
          )}
        </article>
      </div>
      <aside className="registry-panel">
        {registry ?? (
          <>
            <h3>
              {
                [
                  "An invoice with a second instruction.",
                  "The extractor takes the bait.",
                  "Aevum's payee registry disagrees.",
                  "The destination is refused.",
                ][phase]
              }
            </h3>
            <p>
              {phase === 3
                ? "This address is not registered to Northwind Design Studio."
                : "A familiar name and matching address edges do not establish identity. The registry compares every character."}
            </p>
          </>
        )}
        <div className="address-check" data-active={phase >= 1}>
          <span>Extracted destination</span>
          <div className="address-slot" ref={target}>
            <ComparedAddress
              address={destination}
              against={verifiedAddress}
              active={phase >= 2}
            />
            <span className="address-flight" aria-hidden="true">
              <ComparedAddress
                address={destination}
                against={verifiedAddress}
                active={phase >= 2}
              />
            </span>
          </div>
        </div>
        <div className="address-check" data-active={phase >= 2}>
          <span>Verified destination for Northwind Design Studio</span>
          <ComparedAddress
            address={verifiedAddress}
            against={destination}
            active={phase >= 2}
          />
        </div>
        <p className="registry-caption">
          Aevum payee registry · illustrated sample comparison
        </p>
        {!registry && (
          <div className="scene-verdict" role="status">
            {phase >= 2 ? (
              <span className="refused-text">
                {phase === 3
                  ? "Refused: NameMismatch · this address is not registered to Northwind Design Studio"
                  : "Address mismatch · destination cannot clear"}
              </span>
            ) : (
              <span>Awaiting the registry check</span>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

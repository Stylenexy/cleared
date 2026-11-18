"use client";

import { useEffect, useRef, useState } from "react";
import { isDemoRoute } from "../../../lib/demo-helpers";

export function DemoLauncher({
  pathname,
  onStart,
}: {
  pathname: string;
  onStart: () => void;
}) {
  const [hint, setHint] = useState(false);
  const firstHint = useRef(false);
  const leftFirstVisit = useRef(false);
  useEffect(() => {
    if (pathname !== "/try") {
      if (firstHint.current) leftFirstVisit.current = true;
      setHint(false);
      return;
    }
    if (leftFirstVisit.current) return;
    if (!firstHint.current) {
      try {
        if (localStorage.getItem("cleared-demo-hint")) return;
        localStorage.setItem("cleared-demo-hint", "seen");
      } catch {
        /* The tour remains usable when storage is blocked. */
      }
      firstHint.current = true;
    }
    setHint(true);
    const timer = setTimeout(() => setHint(false), 6000);
    return () => clearTimeout(timer);
  }, [pathname]);
  if (!isDemoRoute(pathname)) return null;
  return (
    <div className="demo-launcher-wrap">
      {hint && (
        <div className="demo-hint">
          <span>Want me to show you? About 90 seconds.</span>
          <button
            type="button"
            aria-label="Dismiss demo hint"
            onClick={() => setHint(false)}
          >
            ×
          </button>
        </div>
      )}
      <button
        className="demo-launcher"
        type="button"
        aria-label="Watch live demo"
        onClick={onStart}
      >
        <span className="demo-launcher-head">
          <img src="/clerk-hd/peek.webp" width={40} height={40} alt="Clerk" />
        </span>
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2.5 13 8l-9 5.5Z" fill="currentColor" />
        </svg>
        <span>Watch live demo</span>
      </button>
    </div>
  );
}

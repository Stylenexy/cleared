"use client";

import { forwardRef } from "react";
import type { Point } from "../../../lib/demo-helpers";

export type Highlight = { x: number; y: number; width: number; height: number };
export const GhostCursor = forwardRef<
  HTMLDivElement,
  {
    highlight: Highlight | null;
    click: Point | null;
    clicking: boolean;
  }
>(function GhostCursor({ highlight, click, clicking }, ref) {
  return (
    <div className="demo-visuals" aria-hidden="true">
      {highlight && (
        <div
          className="demo-highlight"
          style={{
            transform: `translate(${highlight.x}px, ${highlight.y}px)`,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}
      {click && (
        <span
          key={`${click.x}-${click.y}`}
          className="demo-ripple"
          style={{ left: click.x, top: click.y }}
        />
      )}
      <div ref={ref} className="demo-cursor">
        <div className={clicking ? "demo-pointer is-clicking" : "demo-pointer"}>
          <svg width="22" height="26" viewBox="0 0 22 26">
            <path
              d="M2 1.5v21l5.5-5.8 4.1 8 4-2-4.1-7.7 8-1.2Z"
              fill="#00BFFF"
              stroke="#031420"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M4 6v12" stroke="white" strokeOpacity=".85" />
          </svg>
          <span className="demo-cursor-name">Clerk</span>
        </div>
      </div>
    </div>
  );
});

import { describe, expect, it } from "vitest";
import {
  dotGridSize,
  sampleDotMatrix,
  splitLetters,
  typingTimeline,
} from "../web/lib/landing-animation";

describe("landing typing clock", () => {
  const lines = ["check", "→ Name mismatch"];
  it("finishes both lines in 1.4 seconds without requiring more scroll", () => {
    expect(typingTimeline(lines, 0)).toEqual(["", ""]);
    expect(typingTimeline(lines, 350)).toEqual(["check", ""]);
    expect(typingTimeline(lines, 700)).toEqual(["check", "→ Nam"]);
    expect(typingTimeline(lines, 1400)).toEqual(lines);
    expect(typingTimeline(lines, 3300)).toEqual(lines);
    expect(typingTimeline(lines, 3400)).toEqual(["", ""]);
  });
  it("handles empty input, invalid clocks and a custom intro duration", () => {
    expect(typingTimeline([], 500)).toEqual([]);
    expect(typingTimeline(lines, -1)).toEqual(["", ""]);
    expect(typingTimeline(lines, Number.NaN)).toEqual(["", ""]);
    expect(typingTimeline(["Hi, I'm Clerk."], 2600, 2600, 2600)).toEqual([
      "Hi, I'm Clerk.",
    ]);
  });
});

describe("dot-matrix sampling", () => {
  it.each([
    [360, 80],
    [1440, 317],
    [10000, 3000],
  ])("bounds work for a %s × %s wordmark", (width, height) => {
    const grid = dotGridSize(width, height);
    expect(grid.columns * grid.rows).toBeLessThanOrEqual(6000);
    expect(grid.columns * grid.spacing).toBeLessThanOrEqual(width);
    expect(grid.rows * grid.spacing).toBeLessThanOrEqual(height);
  });
  it("samples only opaque letter interiors and stays inside the raster", () => {
    const mask = new Uint8Array(16 * 8);
    mask[2 * 16 + 2] = 255;
    mask[6 * 16 + 14] = 101;
    mask[2 * 16 + 6] = 100;
    expect(sampleDotMatrix(mask, 16, 8, 4)).toEqual([
      { x: 2, y: 2 },
      { x: 14, y: 6 },
    ]);
    expect(sampleDotMatrix([], 0, 0)).toEqual([]);
    expect(dotGridSize(-1, Number.NaN)).toMatchObject({ columns: 0, rows: 0 });
  });
});

describe("display letters", () => {
  it("preserves punctuation, spaces and complete Unicode code points", () => {
    expect(splitLetters("pay. Keep")).toEqual([
      "p",
      "a",
      "y",
      ".",
      " ",
      "K",
      "e",
      "e",
      "p",
    ]);
    expect(splitLetters("A🚀→")).toEqual(["A", "🚀", "→"]);
    expect(splitLetters("")).toEqual([]);
  });
});

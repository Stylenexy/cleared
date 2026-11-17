import { describe, expect, it } from "vitest";
import {
  progressWithin,
  storyStep,
  typedLines,
} from "../web/app/components/landing/story-progress";

describe("scroll story progress", () => {
  it("clamps progress and maps a bounded chapter without overshooting its last step", () => {
    expect(progressWithin(-1)).toBe(0);
    expect(progressWithin(2)).toBe(1);
    expect(progressWithin(Number.NaN)).toBe(0);
    expect(progressWithin(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(progressWithin(0.2, 0.5, 0.5)).toBe(0);
    expect(progressWithin(0.5, 0.5, 0.5)).toBe(1);
    expect(
      [-1, 0, 0.249, 0.25, 0.5, 0.75, 1, 3].map((p) => storyStep(p, 4)),
    ).toEqual([0, 0, 0, 1, 2, 3, 3, 3]);
    expect(storyStep(1, 0)).toBe(0);
  });
  it("types sequentially and erases in the same order when scrolling back", () => {
    const lines = ["read", "compare", "refuse"];
    expect(typedLines(lines, -1)).toEqual(["", "", ""]);
    expect(typedLines(lines, 4 / 17)).toEqual(["read", "", ""]);
    expect(typedLines(lines, 9 / 17)).toEqual(["read", "compa", ""]);
    expect(typedLines(lines, 1)).toEqual(lines);
    expect(typedLines(lines, 4 / 17)).toEqual(["read", "", ""]);
    expect(typedLines([], 0.5)).toEqual([]);
  });
});

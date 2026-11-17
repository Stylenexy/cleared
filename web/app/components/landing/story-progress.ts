export function progressWithin(value: number, start = 0, end = 1): number {
  if (!Number.isFinite(value)) return 0;
  if (end <= start) return value >= end ? 1 : 0;
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}

export function storyStep(progress: number, count: number): number {
  return Math.min(
    Math.max(0, count - 1),
    Math.floor(progressWithin(progress) * count),
  );
}

/** Earlier lines finish before the next line begins; reversing scroll erases them. */
export function typedLines(
  lines: readonly string[],
  progress: number,
): string[] {
  const total = lines.reduce((length, line) => length + line.length, 0);
  let remaining = Math.floor(total * progressWithin(progress));
  return lines.map((line) => {
    const visible = line.slice(0, Math.max(0, remaining));
    remaining -= line.length;
    return visible;
  });
}

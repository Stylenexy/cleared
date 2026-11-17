export function splitLetters(text: string): string[] {
  return Array.from(text);
}

export function typingTimeline(
  lines: readonly string[],
  elapsedMs: number,
  durationMs = 1400,
  pauseMs = 2000,
): string[] {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const duration = Math.max(1, durationMs);
  const phase = elapsed % (duration + Math.max(0, pauseMs));
  const total = lines.reduce((sum, line) => sum + splitLetters(line).length, 0);
  let remaining = Math.floor(total * Math.min(1, phase / duration));
  return lines.map((line) => {
    const letters = splitLetters(line);
    const visible = letters.slice(0, Math.max(0, remaining)).join("");
    remaining -= letters.length;
    return visible;
  });
}

export function dotGridSize(width: number, height: number, spacing = 7) {
  const w = Number.isFinite(width) ? Math.max(0, width) : 0;
  const h = Number.isFinite(height) ? Math.max(0, height) : 0;
  const gap = Math.max(
    4,
    Number.isFinite(spacing) ? spacing : 7,
    Math.sqrt((w * h) / 6000),
  );
  return {
    columns: Math.floor(w / gap),
    rows: Math.floor(h / gap),
    spacing: gap,
  };
}

export function sampleDotMatrix(
  alpha: ArrayLike<number>,
  width: number,
  height: number,
  spacing = 7,
) {
  const grid = dotGridSize(width, height, spacing);
  const dots: { x: number; y: number }[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let column = 0; column < grid.columns; column++) {
      const x = Math.floor((column + 0.5) * grid.spacing);
      const y = Math.floor((row + 0.5) * grid.spacing);
      if (alpha[y * width + x] > 100) dots.push({ x, y });
    }
  }
  return dots;
}

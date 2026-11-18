import type { DemoStep } from "./demo-script";

export type Point = { x: number; y: number };
export function arcPoint(from: Point, to: Point, t: number): Point {
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const control = {
    x: (from.x + to.x) / 2 - dy * 0.1,
    y: (from.y + to.y) / 2 + dx * 0.1,
  };
  return {
    x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * control.x + t ** 2 * to.x,
    y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * control.y + t ** 2 * to.y,
  };
}
export const movementDuration = (distance: number) =>
  Math.max(450, Math.min(1100, distance * 0.9));
export const narrationDuration = (text: string) =>
  Math.max(1800, 55 * text.length);
export const dockPosition = (centerY: number, height: number) =>
  centerY >= height * 0.55 ? "top" : "bottom";
export function estimateDemoDuration(steps: readonly DemoStep[]) {
  return steps.reduce(
    (total, step) =>
      total +
      (step.text && !(step.type === "say" && step.end)
        ? narrationDuration(step.text)
        : 0) +
      ("target" in step && step.type !== "waitFor" ? 700 + 160 : 0) +
      (step.type === "wait" ? step.ms : 0),
    0,
  );
}
export const isDemoRoute = (pathname: string) =>
  ["/try", "/attack", "/app", "/app/keys"].includes(pathname);
export const demoSelector = (id: string) => {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  return `[data-demo="${id}"]`;
};

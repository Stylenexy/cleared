/** Abortable active-time clock: pausing also pauses waits and narration holds. */
export class DemoClock {
  constructor(
    readonly signal: AbortSignal,
    readonly paused: () => boolean,
  ) {}
  assertActive() {
    if (this.signal.aborted)
      throw new DOMException("Demo stopped", "AbortError");
  }
  async until(test: () => boolean, timeout = 6000, interval = 100) {
    let elapsed = 0;
    while (elapsed <= timeout) {
      this.assertActive();
      if (!this.paused() && test()) return true;
      if (elapsed === timeout && !this.paused()) return false;
      const delay = Math.min(interval, Math.max(1, timeout - elapsed));
      const started = performance.now();
      const wasPaused = this.paused();
      await this.tick(delay);
      if (!wasPaused && !this.paused())
        elapsed = Math.min(timeout, elapsed + performance.now() - started);
    }
    return false;
  }
  async sleep(ms: number) {
    let remaining = ms;
    while (remaining > 0 || this.paused()) {
      this.assertActive();
      const started = performance.now(),
        wasPaused = this.paused();
      await this.tick(Math.min(40, Math.max(1, remaining)));
      if (!wasPaused && !this.paused())
        remaining -= performance.now() - started;
    }
    this.assertActive();
  }
  private tick(ms: number): Promise<void> {
    this.assertActive();
    return new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Demo stopped", "AbortError"));
      };
      const timer = setTimeout(() => {
        this.signal.removeEventListener("abort", abort);
        resolve();
      }, ms);
      this.signal.addEventListener("abort", abort, { once: true });
    });
  }
}

export function visibleTarget(
  element: HTMLElement | null,
): element is HTMLElement {
  if (!element?.isConnected || element.closest('[aria-hidden="true"]'))
    return false;
  const style = getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) !== 0 &&
    element.getClientRects().length > 0 &&
    !element.matches(":disabled")
  );
}

export async function settleScroll(
  element: HTMLElement,
  clock: DemoClock,
  reduced: boolean,
) {
  const bounds = element.getBoundingClientRect();
  if (
    bounds.top >= 8 &&
    bounds.bottom <= innerHeight - 8 &&
    bounds.left >= 8 &&
    bounds.right <= innerWidth - 8
  )
    return;
  element.scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior: reduced ? "instant" : "smooth",
  });
  let last = element.getBoundingClientRect(),
    stable = 0;
  for (let elapsed = 0; elapsed < 1200; elapsed += 50) {
    await clock.sleep(50);
    const next = element.getBoundingClientRect();
    stable =
      Math.abs(next.top - last.top) < 0.5 &&
      Math.abs(next.left - last.left) < 0.5
        ? stable + 50
        : 0;
    last = next;
    if (stable >= 150) return;
  }
}

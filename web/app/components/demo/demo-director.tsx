"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  DEMO_RESET_SCRIPT,
  DEMO_SCRIPT,
  type DemoStep,
} from "../../../lib/demo-script";
import {
  arcPoint,
  demoSelector,
  dockPosition,
  isDemoRoute,
  movementDuration,
  narrationDuration,
  type Point,
} from "../../../lib/demo-helpers";
import { performDemoAction } from "../../../lib/demo-safety";
import { DemoLauncher } from "./demo-launcher";
import { DemoNarration } from "./demo-narration";
import { GhostCursor, type Highlight } from "./ghost-cursor";
import { DemoClock, settleScroll, visibleTarget } from "./demo-runner";

// Keep the launcher server-renderable; browser APIs and the router start after mount.
export function DemoDirector({ pathname }: { pathname: string }) {
  const [mounted, setMounted] = useState(false);
  const [requestedRun, setRequestedRun] = useState(0);
  const [active, setActive] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      {!active && (
        <DemoLauncher
          pathname={pathname}
          onStart={() => setRequestedRun((value) => value + 1)}
        />
      )}
      {mounted && (
        <DirectorRuntime
          pathname={pathname}
          requestedRun={requestedRun}
          onActiveChange={setActive}
        />
      )}
    </>
  );
}

function DirectorRuntime({
  pathname,
  requestedRun,
  onActiveChange,
}: {
  pathname: string;
  requestedRun: number;
  onActiveChange: (active: boolean) => void;
}) {
  const router = useRouter();
  const path = useRef(pathname);
  path.current = pathname;
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(false);
  const [ending, setEnding] = useState(false);
  const [paused, setPaused] = useState(false);
  const pause = useRef(false);
  const [beat, setBeat] = useState(1);
  const [text, setText] = useState(
    "Three contractor invoices just arrived. I read each one before anything is paid.",
  );
  const [mood, setMood] = useState<"point" | "refuse" | "thumbs">("point");
  const [dock, setDock] = useState<"top" | "bottom">("bottom");
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [click, setClick] = useState<Point | null>(null);
  const [clicking, setClicking] = useState(false);
  const cursor = useRef<HTMLDivElement>(null);
  const position = useRef<Point>({ x: 32, y: 100 });
  const target = useRef<HTMLElement | null>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [reduced, setReduced] = useState(false);
  const reducedRef = useRef(false);
  const abortRun = useRef<AbortController | null>(null);
  const abortStep = useRef<AbortController | null>(null);
  const tween = useRef<gsap.core.Tween | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const returnFocus = useRef(false);
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRequested = useRef(false);

  const closeDrawer = useCallback(() => {
    if (path.current === "/try" && document.querySelector("dialog[open]"))
      performDemoAction(document, path.current, {
        type: "click",
        target: "invoice-close",
      });
  }, []);
  const exit = useCallback(() => {
    abortRun.current?.abort();
    abortStep.current?.abort();
    tween.current?.kill();
    if (rippleTimer.current) clearTimeout(rippleTimer.current);
    closeDrawer();
    setActive(false);
    setEnding(false);
    setPaused(false);
    pause.current = false;
    onActiveChange(false);
    resetRequested.current = false;
    target.current = null;
    setHighlight(null);
    setClick(null);
    returnFocus.current = true;
  }, [closeDrawer, onActiveChange]);
  const start = useCallback(() => {
    abortRun.current?.abort();
    abortStep.current?.abort();
    tween.current?.kill();
    closeDrawer();
    previousFocus.current = document.activeElement as HTMLElement | null;
    pause.current = false;
    setPaused(false);
    setEnding(false);
    setActive(true);
    onActiveChange(true);
    setBeat(1);
    setMood("point");
    setText(
      "Three contractor invoices just arrived. I read each one before anything is paid.",
    );
    setHighlight(null);
    setClick(null);
    setClicking(false);
    target.current = null;
    setRun((value) => value + 1);
  }, [closeDrawer, onActiveChange]);
  const togglePause = useCallback(() => {
    pause.current = !pause.current;
    setPaused(pause.current);
    if (pause.current) tween.current?.pause();
    else tween.current?.resume();
  }, []);
  const next = useCallback(() => {
    abortStep.current?.abort();
  }, []);

  useEffect(() => {
    if (requestedRun > 0) start();
  }, [requestedRun, start]);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedRef.current = media.matches;
      setReduced(media.matches);
      if (media.matches) tween.current?.progress(1);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isDemoRoute(pathname)) {
      exit();
      return;
    }
    const query = new URLSearchParams(location.search);
    if (query.get("demo") !== "1") return;
    const timer = setTimeout(() => {
      query.delete("demo");
      router.replace(
        pathname + (query.size ? `?${query}` : "") + location.hash,
        { scroll: false },
      );
      start();
    }, 800);
    return () => clearTimeout(timer);
  }, [pathname, router, start, exit]);

  useEffect(() => {
    if (!active && returnFocus.current) {
      returnFocus.current = false;
      const element = previousFocus.current?.isConnected
        ? previousFocus.current
        : document.querySelector<HTMLElement>(".demo-launcher");
      element?.focus({ preventScroll: true });
    }
  }, [active]);

  useEffect(() => {
    if (cursor.current) gsap.set(cursor.current, position.current);
  }, [host, ending]);

  // The existing invoice drawer is a modal dialog in the browser's top layer.
  // Portal the demo into it while open so the blocker and controls stay above it.
  useEffect(() => {
    if (!active) return;
    const sync = () =>
      setHost(
        document.querySelector<HTMLElement>("dialog[open]") ?? document.body,
      );
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    return () => observer.disconnect();
  }, [active]);

  const measure = useCallback(() => {
    if (!visibleTarget(target.current)) {
      setHighlight(null);
      return;
    }
    const r = target.current.getBoundingClientRect();
    // Clamp the padded highlight to the viewport; wide tables scroll internally.
    const x = Math.max(2, r.left - 6),
      y = Math.max(2, r.top - 6);
    setHighlight({
      x,
      y,
      width: Math.max(0, Math.min(innerWidth - 2, r.right + 6) - x),
      height: Math.max(0, Math.min(innerHeight - 2, r.bottom + 6) - y),
    });
    setDock(dockPosition(r.top + r.height / 2, innerHeight));
  }, []);

  useEffect(() => {
    if (!active) return;
    const listener = () => measure();
    window.addEventListener("scroll", listener, true);
    window.addEventListener("resize", listener);
    return () => {
      window.removeEventListener("scroll", listener, true);
      window.removeEventListener("resize", listener);
    };
  }, [active, measure]);

  useEffect(() => {
    if (!active) return;
    const controls = () =>
      Array.from(
        overlay.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
      );
    controls()[0]?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        exit();
      } else if (event.code === "Space" && !ending) {
        event.preventDefault();
        event.stopImmediatePropagation();
        togglePause();
      } else if (event.key === "Tab") {
        const buttons = controls(),
          current = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
        event.preventDefault();
        buttons[
          (current + (event.shiftKey ? -1 : 1) + buttons.length) %
            buttons.length
        ]?.focus();
      } else if (!overlay.current?.contains(event.target as Node)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const focus = (event: FocusEvent) => {
      if (!overlay.current?.contains(event.target as Node))
        controls()[0]?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", keydown, true);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      document.removeEventListener("focusin", focus);
    };
  }, [active, ending, host, exit, togglePause]);

  useEffect(() => {
    if (!run || !active) return;
    const controller = new AbortController();
    abortRun.current = controller;
    const clock = new DemoClock(controller.signal, () => pause.current);
    let resetOnly = false;
    const find = async (
      id: string,
      stepClock: DemoClock,
      timeout = 6000,
    ): Promise<HTMLElement | null> => {
      const selector = demoSelector(id);
      if (!selector) return null;
      let element: HTMLElement | null = null;
      const found = await stepClock.until(() => {
        element = document.querySelector<HTMLElement>(selector);
        return visibleTarget(element);
      }, timeout);
      if (!found) console.warn(`[Cleared demo] Skipping missing target: ${id}`);
      return found ? element : null;
    };
    const move = async (element: HTMLElement, stepClock: DemoClock) => {
      await settleScroll(element, stepClock, reducedRef.current);
      target.current = element;
      measure();
      const r = element.getBoundingClientRect();
      const to = {
        x: Math.max(8, Math.min(innerWidth - 72, r.left + r.width / 2)),
        y: Math.max(8, Math.min(innerHeight - 54, r.top + r.height / 2)),
      };
      const duration = movementDuration(
        Math.hypot(to.x - position.current.x, to.y - position.current.y),
      );
      if (reducedRef.current) {
        position.current = to;
        if (cursor.current) gsap.set(cursor.current, { x: to.x, y: to.y });
        // Keep the same reading rhythm while the cursor jumps without animation.
        await stepClock.sleep(duration);
      } else {
        const from = { ...position.current },
          progress = { value: 0 };
        let done = false;
        tween.current = gsap.to(progress, {
          value: 1,
          duration: duration / 1000,
          ease: "power2.inOut",
          onUpdate: () => {
            position.current = arcPoint(from, to, progress.value);
            if (cursor.current) gsap.set(cursor.current, position.current);
          },
          onComplete: () => {
            done = true;
          },
        });
        const kill = () => tween.current?.kill();
        stepClock.signal.addEventListener("abort", kill, { once: true });
        try {
          await stepClock.until(() => done, 1500, 25);
        } finally {
          stepClock.signal.removeEventListener("abort", kill);
          tween.current?.kill();
        }
      }
      await stepClock.sleep(160);
    };
    const execute = async (step: DemoStep, stepClock: DemoClock) => {
      setBeat(step.beat);
      if (step.type === "say" && step.end) {
        target.current = null;
        setHighlight(null);
        setEnding(true);
        return;
      }
      if (step.type === "wait") {
        await stepClock.sleep(step.ms);
        return;
      }
      if (step.type === "waitFor") {
        if ("target" in step) await find(step.target, stepClock, step.timeout);
        else {
          const predicate =
            "predicate" in step
              ? step.predicate
              : () =>
                  visibleTarget(
                    document.querySelector<HTMLElement>(step.selector),
                  );
          if (!(await stepClock.until(predicate, step.timeout)))
            console.warn("[Cleared demo] Wait timed out; skipping step");
        }
        return;
      }
      const element =
        "target" in step && step.target
          ? await find(step.target, stepClock)
          : null;
      if ("target" in step && step.target && !element) return;
      if (element) {
        if (step.type === "scroll") {
          await settleScroll(element, stepClock, reducedRef.current);
          target.current = element;
          measure();
          return;
        }
        await move(element, stepClock);
      } else {
        target.current = null;
        setHighlight(null);
        setDock("bottom");
      }
      await stepClock.sleep(1); // Wait for Resume before any action, including a no-op check.
      if (
        step.type === "click" ||
        step.type === "select" ||
        step.type === "check" ||
        step.type === "navigate"
      ) {
        const clicks =
          step.type === "click" ||
          step.type === "navigate" ||
          (step.type === "check" &&
            (element as HTMLInputElement)?.checked !== step.checked);
        if (!performDemoAction(document, path.current, step)) return;
        if (clicks) {
          if (!reducedRef.current) {
            if (rippleTimer.current) clearTimeout(rippleTimer.current);
            setClick({ ...position.current });
            setClicking(true);
            rippleTimer.current = setTimeout(() => setClick(null), 450);
          }
          await stepClock.sleep(120);
          setClicking(false);
          await stepClock.sleep(40);
        }
        if (step.type === "navigate") {
          target.current = null;
          setHighlight(null);
          if (!(await stepClock.until(() => path.current === step.pathname)))
            console.warn(
              `[Cleared demo] Navigation timed out: ${step.pathname}`,
            );
        }
      }
      if (step.text) {
        setText(step.text);
        setMood(step.mood ?? "point");
        await stepClock.sleep(narrationDuration(step.text));
      }
    };
    void (async () => {
      try {
        if (path.current !== "/try") {
          router.push("/try");
          if (!(await clock.until(() => path.current === "/try"))) {
            exit();
            return;
          }
        }
        // Try it yourself uses this same guarded runner just to reset the sandbox.
        resetOnly = resetRequested.current;
        resetRequested.current = false;
        const steps = resetOnly ? DEMO_RESET_SCRIPT : DEMO_SCRIPT;
        for (let i = 0; i < steps.length; i++) {
          clock.assertActive();
          const stepAbort = new AbortController();
          abortStep.current = stepAbort;
          const abort = () => stepAbort.abort();
          controller.signal.addEventListener("abort", abort, { once: true });
          try {
            await execute(
              steps[i],
              new DemoClock(stepAbort.signal, () => pause.current),
            );
          } catch (error) {
            if (!stepAbort.signal.aborted)
              console.warn("[Cleared demo] Step skipped", error);
            if (!controller.signal.aborted) {
              // Next skips the remainder of a numbered scene, rather than narrating
              // a result for an operation the viewer explicitly skipped.
              const beat = steps[i].beat;
              while (i + 1 < steps.length && steps[i + 1].beat === beat) i++;
            }
          } finally {
            controller.signal.removeEventListener("abort", abort);
            setClicking(false);
          }
        }
        if (resetOnly) exit();
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("[Cleared demo] Tour stopped", error);
          exit();
        }
      }
    })();
    return () => {
      controller.abort();
      abortStep.current?.abort();
      tween.current?.kill();
      if (rippleTimer.current) clearTimeout(rippleTimer.current);
    };
    // A tour owns its lifetime; route transitions must not restart its script.
  }, [run, active, router, exit, measure]);

  const tryYourself = () => {
    resetRequested.current = true;
    start();
  };

  if (!active) return null;
  if (!host) return null;
  return createPortal(
    <div
      ref={overlay}
      className={`demo-overlay${reduced ? " demo-reduced" : ""}`}
    >
      <div
        className="demo-blocker"
        onClick={ending ? exit : undefined}
        aria-hidden="true"
      />
      {ending ? (
        <div
          className="demo-end-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) exit();
          }}
        >
          <section
            className="demo-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-end-title"
          >
            <img
              src="/clerk-hd/cheer.webp"
              height={160}
              width={160}
              alt="Clerk celebrating"
            />
            <h2 id="demo-end-title">That's Cleared.</h2>
            <p>
              The AI can be fooled. The money{" "}
              <span className="serif-accent">can't</span>.
            </p>
            <div className="demo-end-actions">
              <button
                type="button"
                className="demo-primary"
                onClick={tryYourself}
              >
                Try it yourself
              </button>
              <button type="button" onClick={start}>
                Watch again
              </button>
            </div>
          </section>
        </div>
      ) : (
        <>
          <GhostCursor
            ref={cursor}
            highlight={highlight}
            click={click}
            clicking={clicking}
          />
          <DemoNarration
            text={text}
            beat={beat}
            mood={mood}
            dock={dock}
            paused={paused}
            onPause={togglePause}
            onNext={next}
            onExit={exit}
          />
        </>
      )}
    </div>,
    host,
  );
}

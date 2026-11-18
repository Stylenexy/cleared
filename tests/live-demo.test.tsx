import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_CLICK_ALLOWLIST,
  DEMO_RESET_SCRIPT,
  DEMO_SCRIPT,
} from "../web/lib/demo-script";
import {
  arcPoint,
  demoSelector,
  dockPosition,
  estimateDemoDuration,
  movementDuration,
  narrationDuration,
} from "../web/lib/demo-helpers";
import { performDemoAction, type DemoAction } from "../web/lib/demo-safety";
import { DemoClock } from "../web/app/components/demo/demo-runner";
import { DemoLauncher } from "../web/app/components/demo/demo-launcher";
import { RouteChrome } from "../web/app/components/app-shell/route-chrome";
import { GhostCursor } from "../web/app/components/demo/ghost-cursor";
import { DemoNarration } from "../web/app/components/demo/demo-narration";

const route = vi.hoisted(() => ({ pathname: "/try" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("authored live demo", () => {
  it("has a closed allowlist with no real or live-model operations", () => {
    expect(Object.isFrozen(DEMO_CLICK_ALLOWLIST)).toBe(true);
    expect(new Set(DEMO_CLICK_ALLOWLIST).size).toBe(
      DEMO_CLICK_ALLOWLIST.length,
    );
    for (const id of DEMO_CLICK_ALLOWLIST) {
      expect(id).not.toMatch(
        /wallet|save|grant|revoke|upload|export|live-model|live-extract|real-freeze|controls-/,
      );
      expect(id === "try-freeze" || !id.includes("freeze")).toBe(true);
    }
    for (const step of DEMO_SCRIPT) {
      if (["click", "select", "check", "navigate"].includes(step.type)) {
        expect(
          "target" in step && DEMO_CLICK_ALLOWLIST.includes(step.target!),
        ).toBe(true);
      }
      if (step.type === "check" && step.target === "attack-sample-mode")
        expect(step.checked).toBe(false);
    }
  });
  it("keeps known steps, approved narration, all 16 beats, and scene order", () => {
    expect(JSON.parse(JSON.stringify(DEMO_SCRIPT))).toEqual(DEMO_SCRIPT);
    const types = [
      "say",
      "point",
      "click",
      "select",
      "check",
      "scroll",
      "navigate",
      "wait",
      "waitFor",
    ];
    for (const step of DEMO_SCRIPT) {
      expect(types).toContain(step.type);
      if (step.text !== undefined || step.type === "say") {
        expect(step.text?.trim().length).toBeGreaterThan(0);
        expect(step.text).not.toContain("—");
      }
    }
    expect([...new Set(DEMO_SCRIPT.map((step) => step.scene))]).toEqual([
      "try",
      "attack",
      "treasury",
      "controls",
    ]);
    expect([...new Set(DEMO_SCRIPT.map((step) => step.beat))]).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
    const duration = estimateDemoDuration(DEMO_SCRIPT);
    expect(duration).toBeGreaterThanOrEqual(75000);
    expect(duration).toBeLessThanOrEqual(110000);
  });
  it("resets through the safe control before returning the sandbox to the viewer", () => {
    expect(DEMO_RESET_SCRIPT.map((step) => step.type)).toEqual([
      "waitFor",
      "click",
    ]);
    expect(DEMO_RESET_SCRIPT.at(-1)).toMatchObject({
      type: "click",
      target: "try-reset",
    });
    expect(DEMO_SCRIPT.slice(0, DEMO_RESET_SCRIPT.length)).toEqual(
      DEMO_RESET_SCRIPT,
    );
  });
  it("disables extraction before running and points only after arriving at Controls", () => {
    const off = DEMO_SCRIPT.findIndex(
      (step) =>
        step.type === "check" &&
        step.target === "attack-sample-mode" &&
        !step.checked,
    );
    const run = DEMO_SCRIPT.findIndex(
      (step) => step.type === "click" && step.target === "attack-run",
    );
    expect(off).toBeGreaterThan(0);
    expect(off).toBeLessThan(run);
    const controls = DEMO_SCRIPT.findIndex(
      (step) => step.type === "navigate" && step.pathname === "/app/keys",
    );
    expect(
      DEMO_SCRIPT.slice(controls + 1).every((step) =>
        ["point", "scroll", "say"].includes(step.type),
      ),
    ).toBe(true);
  });
});

describe("pure motion helpers", () => {
  it("follows a gentle perpendicular arc with exact endpoints", () => {
    const a = { x: 0, y: 0 },
      b = { x: 100, y: 0 };
    expect(arcPoint(a, b, 0)).toEqual(a);
    expect(arcPoint(a, b, 1)).toEqual(b);
    expect(arcPoint(a, b, 0.5)).toEqual({ x: 50, y: 5 });
    expect(arcPoint(a, a, 0.5)).toEqual(a);
    expect(arcPoint(a, { x: 0, y: 100 }, 0.5)).toEqual({ x: -5, y: 50 });
  });
  it("clamps travel duration and holds narration for reading", () => {
    expect(movementDuration(0)).toBe(450);
    expect(movementDuration(1000)).toBe(900);
    expect(movementDuration(10000)).toBe(1100);
    expect(narrationDuration("Short")).toBe(1800);
    expect(narrationDuration("x".repeat(100))).toBe(5500);
  });
  it("docks away from the target and rejects selector injection", () => {
    expect(dockPosition(549, 1000)).toBe("bottom");
    expect(dockPosition(550, 1000)).toBe("top");
    expect(demoSelector("try-pay")).toBe('[data-demo="try-pay"]');
    expect(demoSelector('try-pay"], button')).toBeNull();
  });
});

// Minimal DOM boundary doubles let us exercise the real action gate without
// launching a browser, changing existing controls, or installing a DOM runtime.
function actionDom(
  id: string,
  options: {
    tag?: string;
    checked?: boolean;
    live?: boolean;
    disabled?: boolean;
    href?: string;
    duplicate?: boolean;
  } = {},
) {
  const element = {
    tagName: options.tag ?? "BUTTON",
    isConnected: true,
    checked: options.checked ?? false,
    value: "trusted",
    click: vi.fn(),
    dispatchEvent: vi.fn(),
    closest: vi.fn(() => ({})),
    matches: vi.fn(() => options.disabled ?? false),
    getClientRects: () => [{}],
    getAttribute: (key: string) =>
      key === "type" ? "checkbox" : key === "href" ? options.href : null,
  };
  const root = {
    querySelectorAll: vi.fn((selector: string) =>
      selector === demoSelector(id)
        ? options.duplicate
          ? [element, element]
          : [element]
        : [],
    ),
    querySelector: vi.fn(() =>
      options.live === undefined ? null : { checked: options.live },
    ),
    defaultView: {
      HTMLSelectElement: class {
        set value(value: string) {
          Object.defineProperty(this, "value", { value, writable: true });
        }
      },
      Event,
    },
  };
  return { element, root: root as unknown as Document };
}

describe("synthetic action safety boundary", () => {
  it("refuses unlisted targets before even querying the DOM", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const id of [
      "connect-wallet",
      "save-grant",
      "save-daily-cap",
      "freeze-all",
      "revoke-agent",
      "upload-invoices",
      "export-csv",
      "live-model",
      "controls-danger",
      'try-pay"],button',
    ]) {
      const { root, element } = actionDom(id);
      expect(
        performDemoAction(root, "/try", { type: "click", target: id }),
      ).toBe(false);
      expect(root.querySelectorAll).not.toHaveBeenCalled();
      expect(element.click).not.toHaveBeenCalled();
    }
    expect(warn).toHaveBeenCalled();
  });
  it("clicks only a single exact hook on its correct page", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { root, element } = actionDom("try-pay");
    expect(
      performDemoAction(root, "/try", { type: "click", target: "try-pay" }),
    ).toBe(true);
    expect(root.querySelectorAll).toHaveBeenCalledWith('[data-demo="try-pay"]');
    expect(element.click).toHaveBeenCalledOnce();
    for (const page of ["/app", "/attack", "/app/keys", "/"])
      expect(
        performDemoAction(root, page, { type: "click", target: "try-pay" }),
      ).toBe(false);
    for (const options of [
      { tag: "A" },
      { disabled: true },
      { duplicate: true },
    ]) {
      const dom = actionDom("try-pay", options);
      expect(
        performDemoAction(dom.root, "/try", {
          type: "click",
          target: "try-pay",
        }),
      ).toBe(false);
      expect(dom.element.click).not.toHaveBeenCalled();
    }
  });
  it("rejects every allowed operation on Controls, including navigation", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const target of DEMO_CLICK_ALLOWLIST) {
      const { root, element } = actionDom(target);
      expect(
        performDemoAction(root, "/app/keys", { type: "click", target }),
      ).toBe(false);
      expect(element.click).not.toHaveBeenCalled();
    }
  });
  it("can only turn live extraction OFF and never treats its toggle as a click", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { root, element } = actionDom("attack-sample-mode", {
      tag: "INPUT",
      checked: true,
    });
    expect(
      performDemoAction(root, "/attack", {
        type: "check",
        target: "attack-sample-mode",
        checked: false,
      }),
    ).toBe(true);
    expect(element.click).toHaveBeenCalledOnce();
    element.click.mockClear();
    for (const action of [
      { type: "check", target: "attack-sample-mode", checked: true },
      { type: "click", target: "attack-sample-mode" },
    ] as DemoAction[]) {
      expect(performDemoAction(root, "/attack", action)).toBe(false);
      expect(element.click).not.toHaveBeenCalled();
    }
    element.checked = false;
    expect(
      performDemoAction(root, "/attack", {
        type: "check",
        target: "attack-sample-mode",
        checked: false,
      }),
    ).toBe(true);
    expect(element.click).not.toHaveBeenCalled();
  });
  it("refuses Run attack if live extraction is still checked, even if the off step was skipped", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const unsafe = actionDom("attack-run", { live: true });
    expect(
      performDemoAction(unsafe.root, "/attack", {
        type: "click",
        target: "attack-run",
      }),
    ).toBe(false);
    expect(unsafe.element.click).not.toHaveBeenCalled();
    const safe = actionDom("attack-run", { live: false });
    expect(
      performDemoAction(safe.root, "/attack", {
        type: "click",
        target: "attack-run",
      }),
    ).toBe(true);
    expect(safe.element.click).toHaveBeenCalledOnce();
  });
  it("sets only the sandbox risk through the native setter and a bubbling change", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { root, element } = actionDom("try-risk", { tag: "SELECT" });
    expect(
      performDemoAction(root, "/try", {
        type: "select",
        target: "try-risk",
        value: "changed",
      }),
    ).toBe(true);
    expect(element.value).toBe("changed");
    expect(element.click).not.toHaveBeenCalled();
    expect(element.dispatchEvent.mock.calls[0][0].type).toBe("change");
    expect(element.dispatchEvent.mock.calls[0][0].bubbles).toBe(true);
    expect(
      performDemoAction(root, "/try", {
        type: "select",
        target: "try-risk",
        value: "other",
      }),
    ).toBe(false);
  });
  it("validates the real navigation href and destination", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const safe = actionDom("nav-attack", { tag: "A", href: "/attack" });
    expect(
      performDemoAction(safe.root, "/try", {
        type: "navigate",
        target: "nav-attack",
        pathname: "/attack",
      }),
    ).toBe(true);
    const unsafe = actionDom("nav-attack", {
      tag: "A",
      href: "https://example.com",
    });
    expect(
      performDemoAction(unsafe.root, "/try", {
        type: "navigate",
        target: "nav-attack",
        pathname: "/attack",
      }),
    ).toBe(false);
    expect(unsafe.element.click).not.toHaveBeenCalled();
  });
});

describe("tour clock", () => {
  it("pauses time and resumes without losing the remaining hold", async () => {
    vi.useFakeTimers();
    const abort = new AbortController();
    let paused = true,
      finished = false;
    const pending = new DemoClock(abort.signal, () => paused)
      .sleep(200)
      .then(() => {
        finished = true;
      });
    await vi.advanceTimersByTimeAsync(1000);
    expect(finished).toBe(false);
    paused = false;
    await vi.advanceTimersByTimeAsync(280);
    await pending;
    expect(finished).toBe(true);
  });
  it("cancels a wait immediately and clears its timer", async () => {
    vi.useFakeTimers();
    const abort = new AbortController();
    const pending = new DemoClock(abort.signal, () => false).sleep(15000);
    const expectation = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    abort.abort();
    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("returns false for an unavailable target rather than throwing", async () => {
    vi.useFakeTimers();
    const abort = new AbortController();
    const pending = new DemoClock(abort.signal, () => false).until(
      () => false,
      600,
    );
    await vi.advanceTimersByTimeAsync(700);
    expect(await pending).toBe(false);
  });
});

describe("tour presentation", () => {
  it("renders an accessible Clerk launcher on each app page and none on the landing", () => {
    for (const pathname of ["/try", "/attack", "/app", "/app/keys"]) {
      route.pathname = pathname;
      const html = renderToStaticMarkup(
        <RouteChrome>
          <main>App</main>
        </RouteChrome>,
      );
      expect(html).toContain('aria-label="Watch live demo"');
      expect(html).toContain("/clerk-hd/peek.webp");
    }
    route.pathname = "/";
    expect(
      renderToStaticMarkup(
        <RouteChrome>
          <main>Landing</main>
        </RouteChrome>,
      ),
    ).not.toContain("demo-launcher");
    expect(
      renderToStaticMarkup(<DemoLauncher pathname="/" onStart={() => {}} />),
    ).toBe("");
  });
  it("provides honest narration, accessible controls, progress, and a distinct cursor", () => {
    const html = renderToStaticMarkup(
      <DemoNarration
        text="Only the owner can clear a hold."
        beat={7}
        mood="thumbs"
        dock="top"
        paused={false}
        onPause={() => {}}
        onNext={() => {}}
        onExit={() => {}}
      />,
    );
    for (const label of [
      "Simulation · no real payments",
      "Pause",
      "Next",
      "Exit",
      "7 / 16",
      'aria-live="polite"',
      "/clerk-hd/thumbs.webp",
    ])
      expect(html).toContain(label);
    const cursor = renderToStaticMarkup(
      <GhostCursor highlight={null} click={null} clicking={false} />,
    );
    expect(cursor).toContain("Clerk");
    expect(cursor).toContain('fill="#00BFFF"');
  });
  it("keeps 360px overlays bounded and disables visual motion under reduced motion", () => {
    const css = readFileSync("web/app/globals.css", "utf8").split(
      "/* Live demo */",
    )[1];
    expect(css).toContain("width: calc(100% - 16px)");
    expect(css).toContain("width: min(480px, 100%)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("transition: none !important");
    expect(css).not.toMatch(/backdrop-filter|\bfilter:/);
  });
});

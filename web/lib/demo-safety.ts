import { DEMO_CLICK_ALLOWLIST } from "./demo-script";
import { demoSelector, isDemoRoute } from "./demo-helpers";

export type DemoAction =
  | { type: "click"; target: string }
  | { type: "navigate"; target: string; pathname: string }
  | { type: "select"; target: string; value: string }
  | { type: "check"; target: string; checked: boolean };

const navigation: Record<string, string> = {
  "nav-try": "/try",
  "nav-attack": "/attack",
  "nav-treasury": "/app",
  "nav-controls": "/app/keys",
};
const clickPages: Record<string, string> = {
  "try-reset": "/try",
  "try-pay": "/try",
  "try-approve": "/try",
  "try-freeze": "/try",
  "invoice-row-3": "/try",
  "invoice-close": "/try",
  "attack-xray": "/attack",
  "attack-run": "/attack",
};

/** All synthetic actions go through this gate and re-resolve their exact hook.
 * The extraction checkbox is an explicit OFF-ONLY exception, never a model action.
 * Controls has no executable targets, even when an owner wallet is connected.
 */
export function performDemoAction(
  root: Document,
  pathname: string,
  action: DemoAction,
): boolean {
  const refuse = () => {
    console.warn(
      `[Cleared demo] Refused or unavailable target: ${action.target}`,
    );
    return false;
  };
  if (
    !DEMO_CLICK_ALLOWLIST.includes(action.target) ||
    !isDemoRoute(pathname) ||
    pathname === "/app/keys"
  )
    return refuse();
  const selector = demoSelector(action.target);
  if (!selector) return refuse();
  const matches = root.querySelectorAll<HTMLElement>(selector);
  if (matches.length !== 1) return refuse();
  const element = matches[0];
  if (
    !element.isConnected ||
    !element.closest(".product-app") ||
    element.matches(":disabled") ||
    !element.getClientRects().length
  )
    return refuse();

  if (action.type === "navigate") {
    if (
      navigation[action.target] !== action.pathname ||
      element.tagName !== "A" ||
      element.getAttribute("href") !== action.pathname
    )
      return refuse();
  } else if (action.type === "check") {
    if (
      pathname !== "/attack" ||
      element.tagName !== "INPUT" ||
      element.getAttribute("type") !== "checkbox"
    )
      return refuse();
    if (
      action.target !== "attack-contract" &&
      !(action.target === "attack-sample-mode" && action.checked === false)
    )
      return refuse();
    if ((element as HTMLInputElement).checked === action.checked) return true;
  } else if (action.type === "select") {
    if (
      pathname !== "/try" ||
      action.target !== "try-risk" ||
      action.value !== "changed" ||
      element.tagName !== "SELECT"
    )
      return refuse();
    const setter = Object.getOwnPropertyDescriptor(
      root.defaultView!.HTMLSelectElement.prototype,
      "value",
    )?.set;
    if (!setter) return refuse();
    setter.call(element, action.value);
    element.dispatchEvent(
      new root.defaultView!.Event("change", { bubbles: true }),
    );
    return true;
  } else {
    if (
      clickPages[action.target] !== pathname ||
      element.tagName !== (action.target === "invoice-row-3" ? "TR" : "BUTTON")
    )
      return refuse();
    if (action.target === "attack-run") {
      const live = root.querySelector<HTMLInputElement>(
        '[data-demo="attack-sample-mode"]',
      );
      // Missing toggle means the UI has no configured provider and defaults to false.
      if (live?.checked) return refuse();
    }
  }
  element.click();
  return true;
}

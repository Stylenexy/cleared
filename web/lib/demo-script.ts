/** Authored tour data only. No callbacks, network requests, or executable selectors. */
export type DemoScene = "try" | "attack" | "treasury" | "controls";
export type DemoStep = {
  scene: DemoScene;
  beat: number;
  text?: string;
  mood?: "point" | "refuse" | "thumbs";
  optional?: boolean;
} & (
  | { type: "say"; target?: string; end?: boolean }
  | { type: "point"; target: string }
  | { type: "click"; target: string }
  | { type: "scroll"; target: string }
  | { type: "select"; target: string; value: string }
  | { type: "check"; target: string; checked: boolean }
  | { type: "navigate"; target: string; pathname: string }
  | { type: "wait"; ms: number }
  | ({ type: "waitFor"; timeout: number } & (
      { target: string } | { selector: string } | { predicate: () => boolean }
    ))
);

// The sole live-extraction toggle exception is OFF-ONLY, enforced by demo-safety.
// No wallet, owner transaction, real freeze, upload, export, or model-run control.
export const DEMO_CLICK_ALLOWLIST: readonly string[] = Object.freeze([
  "try-reset",
  "invoice-row-3",
  "invoice-close",
  "try-pay",
  "try-risk",
  "try-approve",
  "try-freeze",
  "nav-try",
  "nav-attack",
  "nav-treasury",
  "nav-controls",
  "attack-xray",
  "attack-sample-mode",
  "attack-contract",
  "attack-run",
]);

export const DEMO_RESET_SCRIPT: readonly DemoStep[] = [
  {
    scene: "try",
    beat: 1,
    type: "waitFor",
    target: "invoice-table",
    timeout: 15000,
  },
  { scene: "try", beat: 1, type: "click", target: "try-reset" },
];

export const DEMO_SCRIPT: readonly DemoStep[] = [
  ...DEMO_RESET_SCRIPT,
  { scene: "try", beat: 1, type: "wait", ms: 1500 },
  {
    scene: "try",
    beat: 1,
    type: "say",
    target: "invoice-table",
    text: "Three contractor invoices just arrived. I read each one before anything is paid.",
  },
  { scene: "try", beat: 2, type: "click", target: "invoice-row-3" },
  {
    scene: "try",
    beat: 2,
    type: "point",
    target: "invoice-registry",
    mood: "refuse",
    text: "This one claims to be Northwind, but the address differs from Northwind's verified address.",
  },
  { scene: "try", beat: 3, type: "click", target: "invoice-close" },
  { scene: "try", beat: 4, type: "click", target: "try-pay" },
  {
    scene: "try",
    beat: 4,
    type: "waitFor",
    target: "try-result",
    timeout: 15000,
  },
  {
    scene: "try",
    beat: 4,
    type: "point",
    target: "try-result",
    mood: "thumbs",
    text: "Two verified invoices are paid. The lookalike is refused by the contract, not by me.",
  },
  // Clear simulated paid references before demonstrating a fresh held invoice.
  { scene: "try", beat: 5, type: "click", target: "try-reset" },
  {
    scene: "try",
    beat: 5,
    type: "select",
    target: "try-risk",
    value: "changed",
  },
  {
    scene: "try",
    beat: 5,
    type: "point",
    target: "try-hold",
    text: "Ledgerline just changed its payment address. New addresses wait 24 hours.",
  },
  { scene: "try", beat: 6, type: "click", target: "try-pay" },
  {
    scene: "try",
    beat: 6,
    type: "point",
    target: "try-result",
    mood: "refuse",
    text: "So the agent cannot pay it yet.",
  },
  { scene: "try", beat: 7, type: "click", target: "try-approve" },
  {
    scene: "try",
    beat: 7,
    type: "point",
    target: "try-result",
    mood: "thumbs",
    text: "Only the owner can clear a hold.",
  },
  { scene: "try", beat: 8, type: "click", target: "try-reset" },
  { scene: "try", beat: 8, type: "click", target: "try-freeze" },
  { scene: "try", beat: 8, type: "click", target: "try-pay" },
  {
    scene: "try",
    beat: 8,
    type: "point",
    target: "try-result",
    text: "One switch freezes every agent payment.",
  },
  { scene: "try", beat: 9, type: "click", target: "try-reset" },
  {
    scene: "attack",
    beat: 10,
    type: "navigate",
    target: "nav-attack",
    pathname: "/attack",
    text: "Now let's try to fool me.",
  },
  { scene: "attack", beat: 11, type: "click", target: "attack-xray" },
  {
    scene: "attack",
    beat: 11,
    type: "point",
    target: "attack-hidden",
    text: "This invoice hides an instruction aimed at the AI.",
  },
  {
    scene: "attack",
    beat: 12,
    type: "check",
    target: "attack-sample-mode",
    checked: false,
    optional: true,
  },
  {
    scene: "attack",
    beat: 12,
    type: "check",
    target: "attack-contract",
    checked: true,
    optional: true,
  },
  { scene: "attack", beat: 12, type: "click", target: "attack-run" },
  {
    scene: "attack",
    beat: 12,
    type: "waitFor",
    target: "attack-result",
    timeout: 15000,
  },
  {
    scene: "attack",
    beat: 12,
    type: "point",
    target: "attack-result",
    mood: "refuse",
    text: "The AI was fooled into reading the lookalike address. The contract still refuses to pay it.",
  },
  {
    scene: "treasury",
    beat: 13,
    type: "navigate",
    target: "nav-treasury",
    pathname: "/app",
  },
  { scene: "treasury", beat: 13, type: "scroll", target: "treasury-ledger" },
  {
    scene: "treasury",
    beat: 13,
    type: "point",
    target: "treasury-ledger",
    text: "Every payment and refusal is recorded on Aevum testnet, so anyone can check.",
  },
  {
    scene: "controls",
    beat: 14,
    type: "navigate",
    target: "nav-controls",
    pathname: "/app/keys",
  },
  {
    scene: "controls",
    beat: 14,
    type: "point",
    target: "controls-grant",
    text: "The owner decides how much the agent may spend, per invoice and in total, and until when.",
  },
  { scene: "controls", beat: 15, type: "scroll", target: "controls-danger" },
  {
    scene: "controls",
    beat: 15,
    type: "point",
    target: "controls-danger",
    text: "And can freeze or revoke the agent from the owner's wallet at any time.",
  },
  {
    scene: "controls",
    beat: 16,
    type: "say",
    end: true,
    text: "That's Cleared.",
  },
];

import { afterEach, describe, expect, it, vi } from "vitest";
import { proofSettings } from "../tools/testnet-proof.mjs";
import {
  KOPI_PAGI,
  KERTAS_KITA,
  KOPI_PAGI_LOOKALIKES,
} from "../web/lib/sample-addresses";

const settings = () => ({
  CLEARED_PROOF_BROADCAST: "aevum-testnet",
  DEPLOYER_PRIVATE_KEY: "0x" + "11".repeat(32),
  PROOF_AGENT_PRIVATE_KEY: "0x" + "22".repeat(32),
  CLEARED_VAULT: KOPI_PAGI,
  CLEARED_REGISTRY: KERTAS_KITA,
  PROOF_TRUSTED_PAYEE: KOPI_PAGI,
  PROOF_HELD_PAYEE: KERTAS_KITA,
  PROOF_LOOKALIKE_PAYEE: KOPI_PAGI_LOOKALIKES[0],
  PROOF_RUN_ID: "test-run-1",
});
afterEach(() => vi.unstubAllGlobals());
describe("future testnet proof opt-in", () => {
  it("requires explicit broadcast opt-in before looking at credentials", () => {
    expect(() => proofSettings({})).toThrow("CLEARED_PROOF_BROADCAST");
  });
  it.each([
    "DEPLOYER_PRIVATE_KEY",
    "PROOF_AGENT_PRIVATE_KEY",
    "CLEARED_VAULT",
    "CLEARED_REGISTRY",
    "PROOF_TRUSTED_PAYEE",
    "PROOF_HELD_PAYEE",
    "PROOF_LOOKALIKE_PAYEE",
  ])("requires valid %s", (name) => {
    expect(() => proofSettings({ ...settings(), [name]: "invalid" })).toThrow(
      name,
    );
  });
  it.each(["", "bad|table", "x".repeat(49)])(
    "bounds and sanitizes report run IDs",
    (run) => {
      expect(() => proofSettings({ ...settings(), PROOF_RUN_ID: run })).toThrow(
        "PROOF_RUN_ID",
      );
    },
  );
  it("refuses interchangeable proof destinations", () => {
    expect(() =>
      proofSettings({ ...settings(), PROOF_HELD_PAYEE: KOPI_PAGI }),
    ).toThrow("destinations must differ");
  });
  it("validates preparation without a network call or transaction", () => {
    const fetch = vi.fn(() => {
      throw new Error("Network disabled");
    });
    vi.stubGlobal("fetch", fetch);
    expect(proofSettings(settings())).toMatchObject({
      trusted: KOPI_PAGI,
      held: KERTAS_KITA,
      trustedName: "Northwind Design Studio",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

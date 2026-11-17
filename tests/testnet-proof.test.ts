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
  it("uses Aevum testnet RPC unless a loopback rehearsal fork is given", () => {
    expect(proofSettings(settings()).rpc).toBe("https://rpc-test.qday.info");
    expect(
      proofSettings({ ...settings(), CLEARED_PROOF_RPC: "http://127.0.0.1:8547" })
        .rpc,
    ).toBe("http://127.0.0.1:8547");
    for (const url of ["https://evil.example", "http://localhost:8545", "http://127.0.0.1:8545/x"])
      expect(() =>
        proofSettings({ ...settings(), CLEARED_PROOF_RPC: url }),
      ).toThrow("loopback");
  });
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

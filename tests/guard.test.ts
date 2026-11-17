import { describe, it, expect, vi } from "vitest";
import { isClearedPayee, assertClearedPayee } from "@cleared/guard";
import {
  reviewAutonomy,
  holdClock,
  autoPay,
  freeze,
  vaultAbi,
} from "@cleared/sdk";
import { decodeFunctionData, type PublicClient } from "viem";
import { demoPolicy } from "../web/lib/demo";
import { validateInvoice } from "../web/lib/invoices";
const address = "0x1111111111111111111111111111111111111111" as const;
const hash = ("0x" + "11".repeat(32)) as `0x${string}`;
const invoice = validateInvoice(
  {
    reference: "1",
    name: "Kopi Pagi",
    payee: address,
    amount: "0.25",
    currency: "tUSD8",
  },
  hash,
);
const risk = { frozen: false, dailyRemaining: 1_000_000n, holdSeconds: 0n };
describe("guard and autonomy SDK", () => {
  it("reads the supplied registry instead of a hardcoded allowlist", async () => {
    const readContract = vi.fn(async () => true);
    const client = { readContract } as unknown as PublicClient;
    expect(await isClearedPayee(client, address, "Contractor", address)).toBe(
      true,
    );
    await assertClearedPayee(client, address, "Contractor", address);
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address,
        functionName: "isVerified",
        args: ["Contractor", address],
      }),
    );
  });
  it("assertion rejects mismatched payees", async () => {
    const client = {
      readContract: vi.fn(async () => false),
    } as unknown as PublicClient;
    await expect(
      assertClearedPayee(client, address, "Contractor", address),
    ).rejects.toThrow("UnclearedPayee");
  });
  it("RPC errors propagate instead of verifying an unknown payee", async () => {
    const client = {
      readContract: vi.fn(async () => {
        throw new Error("offline");
      }),
    } as unknown as PublicClient;
    await expect(
      isClearedPayee(client, address, "Contractor", address),
    ).rejects.toThrow("offline");
  });
  it("mature recipients can auto-pay under all caps", () =>
    expect(reviewAutonomy(invoice, true, demoPolicy, 1000n, risk)).toBe(
      "Verified",
    ));
  it("holds new or changed recipients and staged-held batches", () => {
    expect(
      reviewAutonomy(invoice, true, demoPolicy, 1000n, {
        ...risk,
        holdSeconds: 1n,
      }),
    ).toContain("PayeeOnHold");
    expect(
      reviewAutonomy(invoice, true, demoPolicy, 1000n, {
        ...risk,
        requiresOwner: true,
      }),
    ).toContain("PayeeOnHold");
  });
  it("frozen state takes precedence over all other decisions", () =>
    expect(
      reviewAutonomy(invoice, false, demoPolicy, 1000n, {
        ...risk,
        frozen: true,
      }),
    ).toContain("Frozen"));
  it("daily budget and total grant both apply", () => {
    expect(
      reviewAutonomy(invoice, true, demoPolicy, 1000n, {
        ...risk,
        dailyRemaining: 249_999n,
      }),
    ).toContain("Daily");
    expect(
      reviewAutonomy(
        invoice,
        true,
        { ...demoPolicy, spent: 800_000n },
        1000n,
        risk,
      ),
    ).toContain("Total");
  });
  it.each([
    [86400n, "24:00:00"],
    [3599n, "00:59:59"],
    [0n, "00:00:00"],
    [-1n, "00:00:00"],
  ])("formats hold %s", (seconds, expected) =>
    expect(holdClock(seconds as bigint)).toBe(expected),
  );
  it("encodes automatic execution and kill switch as legacy writes", async () => {
    const sendTransaction = vi.fn(async () => hash);
    const wallet = {
      account: { address },
      chain: { id: 31337 },
      sendTransaction,
    } as unknown as import("viem").WalletClient;
    await autoPay(wallet, address, 7n);
    await freeze(wallet, address, true);
    const decoded = sendTransaction.mock.calls.map((c) => {
      const tx = (c as unknown as [Record<string, unknown>])[0];
      expect(tx.type).toBe("legacy");
      return decodeFunctionData({
        abi: vaultAbi,
        data: tx.data as `0x${string}`,
      });
    });
    expect(decoded).toEqual([
      { functionName: "agentExecute", args: [7n] },
      { functionName: "setFrozen", args: [true] },
    ]);
  });
});

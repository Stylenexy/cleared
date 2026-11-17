import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPaymentState } from "../web/lib/payment-state";
import { validateInvoice } from "../web/lib/invoices";
import type { Config } from "../web/lib/client";
const rpc = vi.hoisted(() => ({
  getChainId: vi.fn(),
  getBlock: vi.fn(),
  readContract: vi.fn(),
}));
vi.mock("../web/lib/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../web/lib/client")>()),
  reader: () => rpc,
}));
const address = "0x1111111111111111111111111111111111111111" as const;
const config: Config = {
  network: "aevum",
  chainId: 44005,
  rpc: "https://rpc-test.qday.info",
  vault: address,
  registry: address,
  agent: address,
  token: address,
  deployBlock: "1",
  llmAvailable: false,
};
const invoice = validateInvoice(
  {
    reference: "1",
    name: "Kopi Pagi",
    payee: address,
    amount: "0.25",
    currency: "tUSD8",
  },
  ("0x" + "11".repeat(32)) as `0x${string}`,
);
beforeEach(() => {
  rpc.getChainId.mockResolvedValue(44005);
  rpc.getBlock.mockResolvedValue({ timestamp: 1000n });
  rpc.readContract.mockImplementation(
    async ({ functionName }: { functionName: string }) => {
      switch (functionName) {
        case "agents":
          return [1_000_000n, 500_000n, 0n, 2000n, 1n, false];
        case "frozen":
          return false;
        case "dailyRemaining":
          return 1_000_000n;
        case "balanceOf":
          return 10_000_000n;
        case "isVerified":
          return true;
        case "holdRemaining":
          return 0n;
        case "previewPayment":
          return 0;
        default:
          throw new Error("Unexpected read");
      }
    },
  );
});
afterEach(() => vi.clearAllMocks());
describe("configured contract previews", () => {
  it("reads chain, grant, freeze, daily budget, balance, identity and decision", async () => {
    const state = await readPaymentState(config, [invoice]);
    expect(state.items[0].decision).toBe("Verified");
    expect(state.policy.totalLimit).toBe(1_000_000n);
    expect(rpc.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "previewPayment",
        args: [config.agent, invoice, false],
      }),
    );
  });
  it("refuses a wrong-chain RPC", async () => {
    rpc.getChainId.mockResolvedValue(1);
    await expect(readPaymentState(config, [invoice])).rejects.toThrow("chain");
    expect(rpc.readContract).not.toHaveBeenCalled();
  });
  it("does not hide RPC failure behind a simulated decision", async () => {
    rpc.readContract.mockRejectedValue(new Error("RPC unavailable"));
    await expect(readPaymentState(config, [invoice])).rejects.toThrow(
      "RPC unavailable",
    );
  });
  it("requires complete configured addresses", async () => {
    await expect(
      readPaymentState({ ...config, registry: undefined }, [invoice]),
    ).rejects.toThrow("not configured");
  });
  it("projects the shared daily budget across a batch", async () => {
    const original = rpc.readContract.getMockImplementation()!;
    rpc.readContract.mockImplementation(async (args) =>
      args.functionName === "dailyRemaining" ? 400_000n : original(args),
    );
    const second = {
      ...invoice,
      ref: ("0x" + "22".repeat(32)) as `0x${string}`,
    };
    const state = await readPaymentState(config, [invoice, second]);
    expect(state.items.map((i) => i.decision)).toEqual([
      "Verified",
      "Daily limit exceeded",
    ]);
  });
  it("projects available token balance across a batch", async () => {
    const original = rpc.readContract.getMockImplementation()!;
    rpc.readContract.mockImplementation(async (args) =>
      args.functionName === "balanceOf" ? 400_000n : original(args),
    );
    const second = {
      ...invoice,
      ref: ("0x" + "22".repeat(32)) as `0x${string}`,
    };
    const state = await readPaymentState(config, [invoice, second]);
    expect(state.items[1].decision).toBe("Insufficient vault balance");
  });
  it("shows the contract hold reason and remaining seconds", async () => {
    const original = rpc.readContract.getMockImplementation()!;
    rpc.readContract.mockImplementation(async (args) =>
      args.functionName === "previewPayment"
        ? 9
        : args.functionName === "holdRemaining"
          ? 86399n
          : original(args),
    );
    const state = await readPaymentState(config, [invoice]);
    expect(state.items[0].decision).toContain("PayeeOnHold");
    expect(state.items[0].holdSeconds).toBe(86399n);
  });
  it("flags duplicate business references in a batch", async () => {
    const state = await readPaymentState(config, [invoice, invoice]);
    expect(state.items[1].decision).toBe("Duplicate reference in batch");
  });
});

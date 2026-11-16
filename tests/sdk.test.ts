import { describe, it, expect, vi } from "vitest";
import {
  decodeFunctionData,
  keccak256,
  toBytes,
  type WalletClient,
} from "viem";
import {
  amount6,
  displayAmount,
  stage,
  approve,
  reconcile,
  reconcileRows,
  toCsv,
  getLogsChunked,
  reviewInvoice,
  invoiceRef,
  vaultAbi,
  type Invoice,
  type AgentPolicy,
} from "@pagar/sdk";
const addr = "0x1111111111111111111111111111111111111111" as const;
const hash = keccak256(toBytes("source"));
const invoice: Invoice = {
  reference: "INV-1",
  ref: invoiceRef("Kopi Pagi", "INV-1"),
  name: "Kopi Pagi",
  payee: addr,
  amount: 250_000n,
  invoiceHash: hash,
};
const policy: AgentPolicy = {
  totalLimit: 1_000_000n,
  perItemLimit: 500_000n,
  spent: 0n,
  expiresAt: 2000n,
  version: 1n,
  revoked: false,
};
function wallet() {
  const sendTransaction = vi.fn().mockResolvedValue(hash);
  return {
    client: {
      account: { address: addr },
      chain: { id: 31337 },
      sendTransaction,
    } as unknown as WalletClient,
    sendTransaction,
  };
}
describe("SDK", () => {
  it("converts exact six-decimal values", () => {
    expect(amount6("0.000001")).toBe(1n);
    expect(displayAmount(amount6("1234.567890"))).toBe("1234.56789");
  });
  it.each(["0", "-1", "1e6", "1,00", "0.0000001", "NaN", " 1", "01", "1."])(
    "rejects unsafe amount %s",
    (s) => expect(() => amount6(s)).toThrow(),
  );
  it("stage sends encoded items as a legacy transaction", async () => {
    const w = wallet();
    await stage(w.client, addr, [invoice]);
    const sent = w.sendTransaction.mock.calls[0][0];
    expect(sent.type).toBe("legacy");
    const decoded = decodeFunctionData({ abi: vaultAbi, data: sent.data });
    expect(decoded.functionName).toBe("stageBatch");
    expect(decoded.args?.[0]).toEqual([
      expect.objectContaining({ ref: invoice.ref, amount: 250_000n }),
    ]);
  });
  it("approve binds execution to the batch id", async () => {
    const w = wallet();
    await approve(w.client, addr, 7n);
    const decoded = decodeFunctionData({
      abi: vaultAbi,
      data: w.sendTransaction.mock.calls[0][0].data,
    });
    expect(decoded).toEqual({ functionName: "approveAndExecute", args: [7n] });
    expect(w.sendTransaction.mock.calls[0][0].type).toBe("legacy");
  });
  it("refuses empty and oversized batches", () => {
    const w = wallet();
    expect(() => stage(w.client, addr, [])).toThrow();
    expect(() => stage(w.client, addr, Array(51).fill(invoice))).toThrow();
  });
  it("refuses unsupported networks and disconnected wallets", async () => {
    const w = wallet();
    await expect(
      approve({ ...w.client, chain: { id: 1 } } as WalletClient, addr, 1n),
    ).rejects.toThrow("Jaringan");
    await expect(
      approve({ ...w.client, account: undefined }, addr, 1n),
    ).rejects.toThrow("Hubungkan");
  });
  it("chunks inclusive ranges to at most 1000 blocks", async () => {
    const read = vi.fn(async (a: bigint, b: bigint) => [`${a}-${b}`]);
    expect(await getLogsChunked(read, 7n, 2010n)).toEqual([
      "7-1006",
      "1007-2006",
      "2007-2010",
    ]);
    expect(read).toHaveBeenCalledTimes(3);
  });
  it("handles empty and single-block ranges", async () => {
    const read = vi.fn(async () => [1]);
    expect(await getLogsChunked(read, 5n, 4n)).toEqual([]);
    expect(read).not.toHaveBeenCalled();
    expect(await getLogsChunked(read, 5n, 5n)).toEqual([1]);
  });
  it("rejects invalid log range sizes", async () => {
    await expect(
      getLogsChunked(async () => [], 0n, 1n, 1001n),
    ).rejects.toThrow();
    await expect(getLogsChunked(async () => [], 0n, 1n, 0n)).rejects.toThrow();
    await expect(getLogsChunked(async () => [], -1n, 1n)).rejects.toThrow();
  });
  it("propagates RPC errors instead of inventing receipts", async () =>
    expect(
      getLogsChunked(
        async () => {
          throw new Error("RPC down");
        },
        0n,
        2000n,
      ),
    ).rejects.toThrow("RPC down"));
  it("matches refs, address, amount and document hash", () => {
    const payment = { ...invoice, transactionHash: hash };
    expect(reconcileRows([invoice], [payment])[0].status).toBe("Dibayar");
    for (const changed of [
      { amount: 1n },
      { invoiceHash: invoice.ref },
      { payee: "0x2222222222222222222222222222222222222222" as const },
    ])
      expect(
        reconcileRows([invoice], [{ ...payment, ...changed }])[0].status,
      ).toBe("Selisih data pembayaran");
  });
  it("explains rejected and unpaid invoices", () => {
    expect(
      reconcileRows([invoice], [], new Map([[invoice.ref, 1]]))[0].status,
    ).toBe("Nama tidak cocok");
    expect(reconcileRows([invoice], [])[0].status).toBe("Belum dibayar");
  });
  it("does not count a duplicate invoice as paid twice", () => {
    const rows = reconcileRows(
      [invoice, invoice],
      [{ ...invoice, transactionHash: hash }],
      new Map([[invoice.ref, { reason: 6, transactionHash: hash }]]),
    );
    expect(rows.map((r) => r.status)).toEqual([
      "Dibayar",
      "Referensi sudah dibayar",
    ]);
    expect(rows[1].transactionHash).toBe(hash);
  });
  it("reconcile reads chunks and filters a specific batch", async () => {
    const getContractEvents = vi.fn(async () => [
      {
        eventName: "Paid",
        args: { ...invoice, batchId: 4n },
        transactionHash: hash,
      },
      {
        eventName: "Rejected",
        args: { ref: invoice.ref, batchId: 5n, reason: 1 },
        transactionHash: hash,
      },
    ]);
    const client = {
      getBlockNumber: vi.fn(async () => 1000n),
      getContractEvents,
    } as unknown as Parameters<typeof reconcile>[0];
    const rows = await reconcile(client, addr, [invoice], 0n, undefined, 5n);
    expect(rows[0].status).toBe("Nama tidak cocok");
    expect(getContractEvents.mock.calls).toHaveLength(2);
  });
  it("escapes CSV quotes and neutralizes spreadsheet formulas", () => {
    const csv = toCsv([
      {
        reference: '=HYPERLINK("bad")',
        name: "Kopi, Pagi",
        payee: addr,
        amount: "0.25",
        status: "Dibayar",
        transactionHash: hash,
      },
    ]);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"Kopi, Pagi"');
    expect(csv).toContain("\r\n");
  });
  it("preflight respects expiry, revoke, per-item and cumulative limits", () => {
    expect(reviewInvoice(invoice, true, policy, 2000n)).toMatch("kedaluwarsa");
    expect(
      reviewInvoice(invoice, true, { ...policy, revoked: true }, 1000n),
    ).toMatch("dicabut");
    expect(
      reviewInvoice({ ...invoice, amount: 600_000n }, true, policy, 1000n),
    ).toMatch("per item");
    expect(reviewInvoice(invoice, true, policy, 1000n, 800_000n)).toMatch(
      "total",
    );
    expect(reviewInvoice(invoice, true, policy, 1000n)).toBe("Terverifikasi");
  });
});

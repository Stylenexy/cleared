import { decodeEventLog, formatUnits, parseUnits, type Hex } from "viem";
import { vaultAbi, reasons } from "@cleared/sdk";

export interface ExplorerLog {
  block_number: number | string;
  transaction_hash: string;
  index: number;
  topics: (string | null)[];
  data: string;
}
export interface LedgerRow {
  block: string;
  txHash: string;
  logIndex: number;
  event: string;
  batchId?: string;
  ref?: string;
  payee?: string;
  amount?: string;
  reason?: string;
  reasonCode?: number;
  agent?: string;
  frozen?: boolean;
}
// Preserve all six token decimals, with at least two places for small payments.
function amount(value: bigint): string {
  const [whole, fraction = ""] = formatUnits(value, 6).split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}
export function parseLedger(items: readonly ExplorerLog[]): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const item of items) {
    try {
      if (
        !/^\d+$/.test(String(item.block_number)) ||
        (typeof item.block_number === "number" &&
          !Number.isSafeInteger(item.block_number)) ||
        !Number.isSafeInteger(item.index) ||
        item.index < 0 ||
        !/^0x[\da-f]{64}$/i.test(item.transaction_hash)
      )
        continue;
      const topics = item.topics.filter(
        (t): t is Hex => t !== null && /^0x[\da-f]{64}$/i.test(t),
      );
      if (topics.length !== item.topics.filter((t) => t !== null).length)
        continue;
      const decoded = decodeEventLog({
        abi: vaultAbi,
        topics: topics as [Hex, ...Hex[]],
        data: item.data as Hex,
      });
      const row: LedgerRow = {
        block: BigInt(item.block_number).toString(),
        txHash: item.transaction_hash,
        logIndex: item.index,
        event: decoded.eventName,
      };
      const args = decoded.args;
      if ("batchId" in args) row.batchId = args.batchId.toString();
      if ("ref" in args) row.ref = args.ref;
      if ("payee" in args) row.payee = args.payee;
      if ("amount" in args) row.amount = amount(args.amount);
      if ("agent" in args) row.agent = args.agent;
      if ("frozen" in args) row.frozen = args.frozen;
      if ("reason" in args) {
        row.reasonCode = Number(args.reason);
        row.reason =
          reasons[row.reasonCode] ?? `Unknown reason (${row.reasonCode})`;
      }
      rows.push(row);
    } catch {
      /* Unrelated or malformed events are not ledger decisions. */
    }
  }
  return rows.sort((a, b) =>
    BigInt(a.block) === BigInt(b.block)
      ? b.logIndex - a.logIndex
      : BigInt(a.block) > BigInt(b.block)
        ? -1
        : 1,
  );
}
export function summarize(rows: readonly LedgerRow[]) {
  let paid = 0,
    refused = 0,
    cleared = 0n;
  let lastBlock: string | null = null;
  for (const row of rows) {
    if (row.event !== "Paid" && row.event !== "Rejected") continue;
    if (lastBlock === null || BigInt(row.block) > BigInt(lastBlock))
      lastBlock = row.block;
    if (row.event === "Paid") {
      paid++;
      cleared += parseUnits(row.amount ?? "0", 6);
    } else refused++;
  }
  return { paid, refused, clearedAmount: amount(cleared), lastBlock };
}
export interface LedgerResponse {
  rows: LedgerRow[];
  summary: ReturnType<typeof summarize>;
  source: "explorer-test.qday.info" | "rpc-test.qday.info";
  fetchedAt: string;
  truncated: boolean;
}

/** Inclusive eth_getLogs ranges of at most `size` blocks (Aevum limit 1,000), newest `cap` ranges only. */
export function rpcRanges(
  from: bigint,
  latest: bigint,
  size = 1000n,
  cap = 400,
): [bigint, bigint][] {
  const out: [bigint, bigint][] = [];
  if (latest < from) return out;
  for (let a = from; a <= latest; a += size)
    out.push([a, a + size - 1n > latest ? latest : a + size - 1n]);
  return out.slice(-cap);
}

import {
  defineChain,
  encodeFunctionData,
  formatUnits,
  keccak256,
  parseAbi,
  parseUnits,
  toBytes,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from "viem";

// Network facts based on Aevum Starter Kit, PQA Labs, MIT; see NOTICE.
export const aevum = defineChain({
  id: 44005,
  name: "QDay Aevum Testnet",
  nativeCurrency: { name: "Test QDAY", symbol: "tQDAY", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc-test.qday.info"] } },
  blockExplorers: {
    default: { name: "Aevum Explorer", url: "https://explorer-test.qday.info" },
  },
  testnet: true,
});
export const local = defineChain({
  id: 31337,
  name: "Pagar Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  testnet: true,
});
export const TUSD8: Address = "0x456569838f1d43009A91ebA4263147Afd7233483";
export const vaultAbi = parseAbi([
  "function owner() view returns (address)",
  "function registry() view returns (address)",
  "function token() view returns (address)",
  "function agents(address) view returns (uint256 totalLimit, uint256 perItemLimit, uint256 spent, uint64 expiresAt, uint64 version, bool revoked)",
  "function configureAgent(address agent, uint256 total, uint256 perItem, uint64 expiresAt)",
  "function revokeAgent(address agent)",
  "function deposit(uint256 amount)",
  "function stageBatch((bytes32 ref, string name, address payee, uint256 amount, bytes32 invoiceHash)[] items) returns (uint256)",
  "function approveAndExecute(uint256 batchId)",
  "function getBatch(uint256 id) view returns (address agent, uint64 version, bool executed, (bytes32 ref, string name, address payee, uint256 amount, bytes32 invoiceHash)[] items)",
  "function paidRefs(bytes32) view returns (bool)",
  "event Staged(uint256 indexed batchId, address indexed agent, uint256 count)",
  "event Paid(uint256 indexed batchId, bytes32 indexed ref, address indexed payee, uint256 amount, bytes32 invoiceHash)",
  "event Rejected(uint256 indexed batchId, bytes32 indexed ref, uint8 reason)",
]);
export const registryAbi = parseAbi([
  "function isVerified(string name, address account) view returns (bool)",
]);
export const tokenAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
export interface Invoice {
  reference: string;
  name: string;
  payee: Address;
  amount: bigint;
  invoiceHash: Hash;
  ref: Hash;
}
export type BatchItem = Pick<
  Invoice,
  "ref" | "name" | "payee" | "amount" | "invoiceHash"
>;
export interface AgentPolicy {
  totalLimit: bigint;
  perItemLimit: bigint;
  spent: bigint;
  expiresAt: bigint;
  version: bigint;
  revoked: boolean;
}
export const reasons: Record<number, string> = {
  0: "Terverifikasi",
  1: "Nama tidak cocok",
  2: "Di luar batas per item",
  3: "Di luar batas total",
  4: "Kunci kedaluwarsa",
  5: "Kunci dicabut atau diganti",
  6: "Referensi sudah dibayar",
  7: "Data invoice tidak sah",
  8: "Saldo vault tidak cukup",
};
export function amount6(value: string): bigint {
  if (!/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(value))
    throw new Error(
      "Jumlah harus positif, tanpa pemisah ribuan, maksimal 6 desimal.",
    );
  const amount = parseUnits(value, 6);
  if (amount <= 0n || amount > (1n << 256n) - 1n)
    throw new Error("Jumlah di luar rentang.");
  return amount;
}
export const displayAmount = (value: bigint) => formatUnits(value, 6);
export const invoiceRef = (name: string, reference: string): Hash =>
  keccak256(toBytes(JSON.stringify([name, reference])));
export function reviewInvoice(
  invoice: Invoice,
  verified: boolean,
  policy: AgentPolicy,
  now: bigint,
  plannedSpend = 0n,
): string {
  if (policy.revoked || policy.version === 0n) return reasons[5];
  if (now >= policy.expiresAt) return reasons[4];
  if (!verified) return reasons[1];
  if (invoice.amount > policy.perItemLimit) return reasons[2];
  if (invoice.amount + plannedSpend + policy.spent > policy.totalLimit)
    return reasons[3];
  return reasons[0];
}
async function send(
  wallet: WalletClient,
  vault: Address,
  data: Hash,
): Promise<Hash> {
  if (!wallet.account) throw new Error("Hubungkan dompet terlebih dahulu.");
  if (![31337, 44005].includes(wallet.chain?.id ?? 0))
    throw new Error("Jaringan tidak didukung.");
  return wallet.sendTransaction({
    account: wallet.account,
    chain: wallet.chain,
    to: vault,
    data,
    type: "legacy",
  });
}
export function stage(
  wallet: WalletClient,
  vault: Address,
  items: readonly BatchItem[],
): Promise<Hash> {
  if (!items.length || items.length > 50)
    throw new Error("Batch harus berisi 1 sampai 50 invoice.");
  return send(
    wallet,
    vault,
    encodeFunctionData({
      abi: vaultAbi,
      functionName: "stageBatch",
      args: [items],
    }),
  );
}
export function approve(
  wallet: WalletClient,
  vault: Address,
  batchId: bigint,
): Promise<Hash> {
  return send(
    wallet,
    vault,
    encodeFunctionData({
      abi: vaultAbi,
      functionName: "approveAndExecute",
      args: [batchId],
    }),
  );
}
// Chunk strategy adapted from Aevum Starter Kit packages/aevum/src/logs.ts (MIT).
export async function getLogsChunked<T>(
  read: (from: bigint, to: bigint) => Promise<T[]>,
  from: bigint,
  to: bigint,
  step = 1000n,
): Promise<T[]> {
  if (step < 1n || step > 1000n || from < 0n)
    throw new Error("Rentang log harus 1 sampai 1.000 blok.");
  const result: T[] = [];
  for (let start = from; start <= to; start += step)
    result.push(
      ...(await read(start, start + step - 1n > to ? to : start + step - 1n)),
    );
  return result;
}
export interface Settlement {
  ref: Hash;
  payee: Address;
  amount: bigint;
  invoiceHash: Hash;
  transactionHash: Hash;
}
export interface Reconciliation {
  reference: string;
  name: string;
  payee: Address;
  amount: string;
  status: string;
  transactionHash: string;
}
export interface Rejection {
  reason: number;
  transactionHash: Hash;
}
export function reconcileRows(
  invoices: readonly Invoice[],
  payments: readonly Settlement[],
  rejected: ReadonlyMap<string, number | Rejection> = new Map(),
): Reconciliation[] {
  const consumed = new Set<Settlement>();
  return invoices.map((i) => {
    const matching = payments.filter((p) => p.ref === i.ref);
    const exact = matching.filter(
      (p) =>
        p.payee.toLowerCase() === i.payee.toLowerCase() &&
        p.amount === i.amount &&
        p.invoiceHash === i.invoiceHash,
    );
    const paid = exact.find((p) => !consumed.has(p));
    if (paid) consumed.add(paid);
    const rejection = rejected.get(i.ref);
    const reason =
      typeof rejection === "number" ? rejection : rejection?.reason;
    const status = paid
      ? "Dibayar"
      : exact.length
        ? reasons[6]
        : matching.length
          ? "Selisih data pembayaran"
          : reason !== undefined
            ? (reasons[reason] ?? "Ditolak")
            : "Belum dibayar";
    return {
      reference: i.reference,
      name: i.name,
      payee: i.payee,
      amount: displayAmount(i.amount),
      status,
      transactionHash:
        paid?.transactionHash ??
        (typeof rejection === "object"
          ? rejection.transactionHash
          : undefined) ??
        matching[0]?.transactionHash ??
        "",
    };
  });
}
export async function reconcile(
  client: PublicClient,
  vault: Address,
  invoices: readonly Invoice[],
  fromBlock: bigint,
  toBlock?: bigint,
  batchId?: bigint,
): Promise<Reconciliation[]> {
  const end = toBlock ?? (await client.getBlockNumber());
  const logs = await getLogsChunked(
    (from, to) =>
      client.getContractEvents({
        address: vault,
        abi: vaultAbi,
        fromBlock: from,
        toBlock: to,
        strict: true,
      }),
    fromBlock,
    end,
  );
  const payments: Settlement[] = [];
  const rejected = new Map<string, Rejection>();
  for (const log of logs) {
    if (batchId !== undefined && log.args.batchId !== batchId) continue;
    if (log.eventName === "Paid")
      payments.push({ ...log.args, transactionHash: log.transactionHash });
    if (log.eventName === "Rejected")
      rejected.set(log.args.ref, {
        reason: log.args.reason,
        transactionHash: log.transactionHash,
      });
  }
  return reconcileRows(invoices, payments, rejected);
}
export function toCsv(rows: readonly Reconciliation[]): string {
  // Prevent spreadsheet formula execution even when invoice fields are attacker controlled.
  const quote = (s: string) =>
    '"' + (/^[\s]*[=+@-]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
  return [
    ["Referensi", "Penerima", "Alamat", "tUSD8", "Status", "Transaksi"],
    ...rows.map((r) => [
      r.reference,
      r.name,
      r.payee,
      r.amount,
      r.status,
      r.transactionHash,
    ]),
  ]
    .map((r) => r.map(quote).join(","))
    .join("\r\n");
}

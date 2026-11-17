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
  name: "Cleared Local",
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
  "function withdraw(uint256 amount)",
  "function stageBatch((bytes32 ref, string name, address payee, uint256 amount, bytes32 invoiceHash)[] items) returns (uint256)",
  "function approveAndExecute(uint256 batchId)",
  "function agentExecute(uint256 batchId)",
  "function batchRequiresOwner(uint256 batchId, uint256 index) view returns (bool)",
  "function setFrozen(bool value)",
  "function frozen() view returns (bool)",
  "function dailyLimit() view returns (uint256)",
  "function dailyRemaining() view returns (uint256)",
  "function setDailyLimit(uint256 limit)",
  "function previewPayment(address agent, (bytes32 ref, string name, address payee, uint256 amount, bytes32 invoiceHash) item, bool ownerApproval) view returns (uint8)",
  "function getBatch(uint256 id) view returns (address agent, uint64 version, bool executed, (bytes32 ref, string name, address payee, uint256 amount, bytes32 invoiceHash)[] items)",
  "function paidRefs(bytes32) view returns (bool)",
  "event Staged(uint256 indexed batchId, address indexed agent, uint256 count)",
  "event Paid(uint256 indexed batchId, bytes32 indexed ref, address indexed payee, uint256 amount, bytes32 invoiceHash)",
  "event Rejected(uint256 indexed batchId, bytes32 indexed ref, uint8 reason)",
  "event Withdrawn(address indexed owner, uint256 amount)",
  "event AgentRevoked(address indexed agent)",
  "event AgentConfigured(address indexed agent, uint64 version)",
  "event FreezeChanged(bool frozen)",
]);
export const registryAbi = parseAbi([
  "function isVerified(string name, address account) view returns (bool)",
  "function holdRemaining(string name, address account) view returns (uint256)",
  "function trustDelay() view returns (uint256)",
  "function identityRegistry() view returns (address)",
  "function payees(bytes32 nameHash) view returns (address account, bytes32 documentHash, uint256 identityId, uint256 verifiedAt)",
]);
export const identityAbi = parseAbi([
  "function resolve(uint256 id) view returns (address account, string metadataURI, uint64 revision)",
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
  0: "Verified",
  1: "Name mismatch",
  2: "Per-item limit exceeded",
  3: "Total limit exceeded",
  4: "Agent key expired",
  5: "Agent key revoked or replaced",
  6: "Reference already paid",
  7: "Invalid invoice data",
  8: "Insufficient vault balance",
  9: "PayeeOnHold: owner approval required",
  10: "Frozen: kill switch is active",
  11: "Daily limit exceeded",
};
export function amount6(value: string): bigint {
  if (!/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(value))
    throw new Error(
      "Amount must be positive, with no thousands separator and at most 6 decimals.",
    );
  const amount = parseUnits(value, 6);
  if (amount <= 0n || amount > (1n << 256n) - 1n)
    throw new Error("Amount out of range.");
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
  if (!wallet.account) throw new Error("Connect a wallet first.");
  if (![31337, 44005].includes(wallet.chain?.id ?? 0))
    throw new Error("Unsupported network.");
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
    throw new Error("A batch must contain 1 to 50 invoices.");
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
export function autoPay(
  wallet: WalletClient,
  vault: Address,
  batchId: bigint,
): Promise<Hash> {
  return send(
    wallet,
    vault,
    encodeFunctionData({
      abi: vaultAbi,
      functionName: "agentExecute",
      args: [batchId],
    }),
  );
}
export function freeze(
  wallet: WalletClient,
  vault: Address,
  value: boolean,
): Promise<Hash> {
  return send(
    wallet,
    vault,
    encodeFunctionData({
      abi: vaultAbi,
      functionName: "setFrozen",
      args: [value],
    }),
  );
}
export interface RiskState {
  frozen: boolean;
  dailyRemaining: bigint;
  holdSeconds: bigint;
  requiresOwner?: boolean;
}
export function reviewAutonomy(
  invoice: Invoice,
  verified: boolean,
  policy: AgentPolicy,
  now: bigint,
  risk: RiskState,
): string {
  if (risk.frozen) return reasons[10];
  const basic = reviewInvoice(invoice, verified, policy, now);
  if (![reasons[0], reasons[2], reasons[3]].includes(basic)) return basic;
  if (risk.requiresOwner || risk.holdSeconds > 0n) return reasons[9];
  if (basic !== reasons[0]) return basic;
  if (invoice.amount > risk.dailyRemaining) return reasons[11];
  return reasons[0];
}
export function holdClock(seconds: bigint): string {
  const s = seconds < 0n ? 0n : seconds;
  return `${(s / 3600n).toString().padStart(2, "0")}:${((s % 3600n) / 60n).toString().padStart(2, "0")}:${(s % 60n).toString().padStart(2, "0")}`;
}
// Chunk strategy adapted from Aevum Starter Kit packages/aevum/src/logs.ts (MIT).
export async function getLogsChunked<T>(
  read: (from: bigint, to: bigint) => Promise<T[]>,
  from: bigint,
  to: bigint,
  step = 1000n,
): Promise<T[]> {
  if (step < 1n || step > 1000n || from < 0n)
    throw new Error("Log ranges must span 1 to 1,000 blocks.");
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
  explanation: string;
  transactionHash: string;
}
function explainMismatch(invoice: Invoice, payment: Settlement): string {
  const details = [
    `${invoice.reference} expected ${displayAmount(invoice.amount)} tUSD8 to ${invoice.payee}; Paid shows ${displayAmount(payment.amount)} tUSD8 to ${payment.payee}`,
  ];
  if (payment.amount < invoice.amount)
    details.push(
      `short by ${displayAmount(invoice.amount - payment.amount)} tUSD8`,
    );
  if (payment.amount > invoice.amount)
    details.push(
      `over by ${displayAmount(payment.amount - invoice.amount)} tUSD8`,
    );
  if (payment.payee.toLowerCase() !== invoice.payee.toLowerCase())
    details.push("the recipient address differs");
  if (payment.invoiceHash !== invoice.invoiceHash)
    details.push(
      `the document hash differs (expected ${invoice.invoiceHash}, Paid shows ${payment.invoiceHash})`,
    );
  return details.join("; ") + ".";
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
      ? "Paid"
      : exact.length
        ? reasons[6]
        : matching.length
          ? explainMismatch(i, matching[0])
          : reason !== undefined
            ? (reasons[reason] ?? "Rejected")
            : "Unpaid";
    return {
      reference: i.reference,
      name: i.name,
      payee: i.payee,
      amount: displayAmount(i.amount),
      status,
      explanation: paid
        ? `${i.reference} was paid in full to the expected recipient with the expected document hash.`
        : matching.length && !exact.length
          ? status
          : `${i.reference}: ${status}.`,
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
    if (
      batchId !== undefined &&
      (!("batchId" in log.args) || log.args.batchId !== batchId)
    )
      continue;
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
    [
      "Reference",
      "Payee",
      "Address",
      "tUSD8",
      "Status",
      "Explanation",
      "Transaction",
    ],
    ...rows.map((r) => [
      r.reference,
      r.name,
      r.payee,
      r.amount,
      r.status,
      r.explanation,
      r.transactionHash,
    ]),
  ]
    .map((r) => r.map(quote).join(","))
    .join("\r\n");
}

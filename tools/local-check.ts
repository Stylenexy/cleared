import { readFile, writeFile } from "node:fs/promises";
import {
  createWalletClient,
  http,
  decodeEventLog,
  type Address,
} from "viem";
import {
  local,
  stage,
  approve,
  reconcile,
  toCsv,
  vaultAbi,
  tokenAbi,
} from "@pagar/sdk";
import { parseInvoice } from "../web/lib/invoices.ts";
import { reader, type Config } from "../web/lib/client.ts";
const saved = JSON.parse(await readFile(".local/deployment.json", "utf8"));
const config: Config = {
  ...saved,
  network: "local",
  chainId: 31337,
  rpc: "http://127.0.0.1:8545",
  llmAvailable: false,
};
const client = reader(config);
if ((await client.getChainId()) !== 31337) throw new Error("Local only");
const invoices = await Promise.all(
  ["01-kopi.txt", "02-kertas.txt", "03-beracun.txt"].map(async (p) =>
    parseInvoice(await readFile("web/public/samples/" + p, "utf8")),
  ),
);
const agent = createWalletClient({
  account: saved.agent as Address,
  chain: local,
  transport: http("http://127.0.0.1:8545"),
});
const owner = createWalletClient({
  account: saved.owner as Address,
  chain: local,
  transport: http("http://127.0.0.1:8545"),
});
const stageHash = await stage(agent, saved.vault, invoices);
const staged = await client.waitForTransactionReceipt({ hash: stageHash });
let batchId: bigint | undefined;
for (const log of staged.logs) {
  try {
    const event = decodeEventLog({
      abi: vaultAbi,
      data: log.data,
      topics: log.topics,
    });
    if (event.eventName === "Staged") batchId = event.args.batchId;
  } catch {}
}
if (batchId === undefined) throw new Error("No batch");
const executeHash = await approve(owner, saved.vault, batchId);
const receipt = await client.waitForTransactionReceipt({ hash: executeHash });
if (receipt.status !== "success") throw new Error("Execution reverted");
const rows = await reconcile(
  client,
  saved.vault,
  invoices,
  0n,
  receipt.blockNumber,
  batchId,
);
if (
  rows.filter((r) => r.status === "Dibayar").length !== 2 ||
  rows[2].status !== "Nama tidak cocok"
)
  throw new Error("Unexpected reconciliation: " + JSON.stringify(rows));
const poisonBalance = await client.readContract({
  address: saved.token,
  abi: tokenAbi,
  functionName: "balanceOf",
  args: [invoices[2].payee],
});
if (poisonBalance !== 0n) throw new Error("Poisoned payee received funds");
// All transactions must be legacy, including deployment and SDK writes.
for (let b = 0n; b <= receipt.blockNumber; b++) {
  const block = await client.getBlock({
    blockNumber: b,
    includeTransactions: true,
  });
  if (
    block.transactions.some((t) => typeof t !== "string" && t.type !== "legacy")
  )
    throw new Error("Non-legacy transaction");
}
await writeFile(".local/reconciliation.csv", toCsv(rows));
await writeFile(
  ".local/proof.json",
  JSON.stringify(
    {
      network: "Anvil local only",
      stageHash,
      executeHash,
      batchId: batchId.toString(),
      rows,
      poisonBalance: poisonBalance.toString(),
    },
    null,
    2,
  ),
);
console.log(
  "Local integration PASS: 2 paid, 1 NameMismatch, poison balance 0, all transactions legacy.",
);
console.log("Proof .local/proof.json; export .local/reconciliation.csv");

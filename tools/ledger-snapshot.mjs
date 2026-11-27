// Freeze the vault's on-chain events into web/lib/ledger-snapshot.json, read straight from the public Aevum RPC.
// The ledger API serves this snapshot plus anything newer, so the record stays readable when the explorer API is down
// and the chain has moved far past the deploy block. Every row keeps its transaction hash, so anyone can verify it.
// Usage: node tools/ledger-snapshot.mjs [toBlock]
import { writeFile } from "node:fs/promises";

const RPC = process.env.CLEARED_RPC ?? "https://rpc-test.qday.info";
const VAULT = "0x8fba7dd67e294b3ba5ca164748b9f41c03bad13c";
const FROM = 3380779n; // ClearedVault deploy block
const call = async (method, params, tries = 4) => {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await r.json();
      if (body.error || body.result === undefined) throw new Error(JSON.stringify(body.error));
      return body.result;
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((ok) => setTimeout(ok, 800 * (i + 1)));
    }
  }
};
const latest = BigInt(process.argv[2] ?? (await call("eth_blockNumber", [])));
const ranges = [];
for (let a = FROM; a <= latest; a += 1000n) ranges.push([a, a + 999n > latest ? latest : a + 999n]);
const logs = [];
let next = 0, done = 0;
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (next < ranges.length) {
      const [a, b] = ranges[next++];
      const found = await call("eth_getLogs", [
        { address: VAULT, fromBlock: `0x${a.toString(16)}`, toBlock: `0x${b.toString(16)}` },
      ]);
      for (const log of found)
        logs.push({
          block_number: Number(BigInt(log.blockNumber)),
          transaction_hash: log.transactionHash,
          index: Number(BigInt(log.logIndex)),
          topics: log.topics,
          data: log.data,
        });
      if (++done % 100 === 0) process.stderr.write(`${done}/${ranges.length}\n`);
    }
  }),
);
logs.sort((x, y) => y.block_number - x.block_number || y.index - x.index);
const out = { vault: VAULT, fromBlock: Number(FROM), throughBlock: Number(latest), takenAt: new Date().toISOString(), logs };
await writeFile(new URL("../web/lib/ledger-snapshot.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`${logs.length} events, blocks ${FROM}..${latest}, ${ranges.length} ranges`);

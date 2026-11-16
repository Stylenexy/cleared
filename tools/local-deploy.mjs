import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createPublicClient, createWalletClient, http } from "viem";
import { anvil } from "viem/chains";
// Deliberately fixed loopback endpoint; this script cannot target Aevum.
const transport = http("http://127.0.0.1:8545");
const client = createPublicClient({ chain: anvil, transport });
if ((await client.getChainId()) !== 31337)
  throw new Error("Local deploy requires chain 31337");
const accounts = await createWalletClient({
  chain: anvil,
  transport,
}).getAddresses();
const [owner, agent] = accounts;
if (!owner || !agent)
  throw new Error("Anvil must expose two unlocked local accounts.");
const wallet = createWalletClient({ account: owner, chain: anvil, transport });
async function receipt(hash) {
  const r = await client.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("Local transaction failed");
  return r;
}
async function artifact(name) {
  return JSON.parse(await readFile(`out/${name}.sol/${name}.json`, "utf8"));
}
async function deploy(name, args = []) {
  const a = await artifact(name);
  const r = await receipt(
    await wallet.deployContract({
      abi: a.abi,
      bytecode: a.bytecode.object,
      args,
      type: "legacy",
    }),
  );
  return r.contractAddress;
}
const token = await deploy("MockUSD8");
const registry = await deploy("PayeeRegistry", [owner]);
const vault = await deploy("PagarVault", [owner, token, registry]);
async function write(address, name, fn, args) {
  const a = await artifact(name);
  return receipt(
    await wallet.writeContract({
      address,
      abi: a.abi,
      functionName: fn,
      args,
      type: "legacy",
    }),
  );
}
await write(registry, "PayeeRegistry", "register", [
  "Kopi Pagi",
  "0x1111111111111111111111111111111111111111",
  "0x" + "00".repeat(32),
]);
await write(registry, "PayeeRegistry", "register", [
  "Kertas Kita",
  "0x2222222222222222222222222222222222222222",
  "0x" + "00".repeat(32),
]);
await write(token, "MockUSD8", "mint", [owner, 10_000_000n]);
await write(token, "MockUSD8", "approve", [vault, 10_000_000n]);
await write(vault, "PagarVault", "deposit", [10_000_000n]);
const now = (await client.getBlock()).timestamp;
const last = await write(vault, "PagarVault", "configureAgent", [
  agent,
  1_000_000n,
  500_000n,
  now + 86400n,
]);
const config = {
  owner,
  agent,
  token,
  registry,
  vault,
  deployBlock: "0",
  setupBlock: last.blockNumber.toString(),
};
await mkdir(".local", { recursive: true });
await writeFile(".local/deployment.json", JSON.stringify(config, null, 2));
console.log("Local contracts ready:", JSON.stringify(config, null, 2));

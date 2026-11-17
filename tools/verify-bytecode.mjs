// Read-only: compares deployed Aevum testnet runtime bytecode with the local Foundry build.
// Usage: forge build && node tools/verify-bytecode.mjs
// Immutable slots (owner, token, registry addresses) are masked; everything else, including
// the Solidity metadata hash that commits to the exact sources and settings, must match.
import { readFile } from "node:fs/promises";
import { createPublicClient, http } from "viem";

const rpc = "https://rpc-test.qday.info";
const deployed = {
  PayeeRegistry: "0xad297045531da0e71b9ecd3de215d2b63cb74e1d",
  ClearedVault: "0x8fba7dd67e294b3ba5ca164748b9f41c03bad13c",
  IdentityRegistry: "0xBC4A33597D5f0faf11d157dE6dE74cD4E96E088f",
};

const client = createPublicClient({ transport: http(rpc, { timeout: 15_000 }) });
let failures = 0;
for (const [name, address] of Object.entries(deployed)) {
  const artifact = JSON.parse(
    await readFile(`out/${name}.sol/${name}.json`, "utf8"),
  );
  const local = artifact.deployedBytecode.object.toLowerCase().replace(/^0x/, "");
  const chain = (await client.getCode({ address }))?.toLowerCase().replace(/^0x/, "") ?? "";
  const masked = chain.split("");
  for (const refs of Object.values(artifact.deployedBytecode.immutableReferences ?? {}))
    for (const { start, length } of refs)
      masked.splice(start * 2, length * 2, ..."0".repeat(length * 2));
  const ok = chain.length === local.length && masked.join("") === local;
  const meta = local.slice(local.lastIndexOf("a264") + 14, local.lastIndexOf("a264") + 78);
  console.log(`${ok ? "MATCH" : "DIFFERENT"}  ${name}  ${address}  metadata ${meta.slice(0, 16)}…`);
  if (!ok) failures++;
}
process.exit(failures ? 1 : 0);

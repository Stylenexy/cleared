import { readFile } from "node:fs/promises";
import path from "node:path";
import { llmAvailable } from "./invoices";
import { isAddress } from "viem";
const address = (value: unknown) =>
  typeof value === "string" && isAddress(value) ? value : undefined;
export const publicRegistry = () => address(process.env.CLEARED_REGISTRY);
const block = (value: unknown) =>
  typeof value === "string" && /^\d{1,78}$/.test(value) ? value : "0";
export async function publicConfig() {
  const network =
    process.env.CLEARED_NETWORK ??
    (process.env.CLEARED_VAULT ? "aevum" : "demo");
  const common = {
    aevumRegistry: publicRegistry(),
    llmAvailable: llmAvailable(),
    deployBlock: block(process.env.CLEARED_DEPLOY_BLOCK),
  };
  if (network === "aevum")
    return {
      ...common,
      network,
      chainId: 44005,
      rpc: "https://rpc-test.qday.info",
      vault: address(process.env.CLEARED_VAULT),
      registry: publicRegistry(),
      agent: address(process.env.CLEARED_AGENT),
      token: "0x456569838f1d43009A91ebA4263147Afd7233483",
    };
  if (network === "local") {
    try {
      const root =
        path.basename(process.cwd()) === "web"
          ? path.resolve("..")
          : process.cwd();
      const saved = JSON.parse(
        await readFile(path.join(root, ".local/deployment.json"), "utf8"),
      );
      // Explicit public fields only. Never spread a disk file into a public response.
      return {
        ...common,
        network,
        chainId: 31337,
        rpc: "http://127.0.0.1:8545",
        vault: address(saved.vault),
        registry: address(saved.registry),
        agent: address(saved.agent),
        owner: address(saved.owner),
        token: address(saved.token),
        deployBlock: block(saved.deployBlock),
      };
    } catch {
      return {
        ...common,
        network,
        chainId: 31337,
        rpc: "http://127.0.0.1:8545",
      };
    }
  }
  return {
    ...common,
    network: "demo",
    chainId: 44005,
    rpc: "https://rpc-test.qday.info",
  };
}

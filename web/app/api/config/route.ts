import { readFile } from "node:fs/promises";
import path from "node:path";
import { llmAvailable } from "../../../lib/invoices";
export const dynamic = "force-dynamic";
export async function GET() {
  const network =
    process.env.CLEARED_NETWORK ??
    (process.env.CLEARED_VAULT ? "aevum" : "demo");
  const common = {
    llmAvailable: llmAvailable(),
    deployBlock: process.env.CLEARED_DEPLOY_BLOCK ?? "0",
  };
  if (network === "aevum")
    return Response.json({
      ...common,
      network,
      chainId: 44005,
      rpc: "https://rpc-test.qday.info",
      vault: process.env.CLEARED_VAULT,
      registry: process.env.CLEARED_REGISTRY,
      agent: process.env.CLEARED_AGENT,
      token: "0x456569838f1d43009A91ebA4263147Afd7233483",
    });
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
      return Response.json({
        ...common,
        network,
        chainId: 31337,
        rpc: "http://127.0.0.1:8545",
        vault: saved.vault,
        registry: saved.registry,
        agent: saved.agent,
        owner: saved.owner,
        token: saved.token,
        deployBlock: saved.deployBlock ?? "0",
      });
    } catch {
      return Response.json({
        ...common,
        network,
        chainId: 31337,
        rpc: "http://127.0.0.1:8545",
      });
    }
  }
  return Response.json({
    ...common,
    network: "demo",
    chainId: 44005,
    rpc: "https://rpc-test.qday.info",
  });
}

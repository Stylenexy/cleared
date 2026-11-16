import { readFile } from "node:fs/promises";
import path from "node:path";
export const dynamic = "force-dynamic";
export async function GET() {
  const network = process.env.PAGAR_NETWORK ?? "local";
  if (network === "aevum")
    return Response.json({
      network,
      chainId: 44005,
      rpc: "https://rpc-test.qday.info",
      vault: process.env.PAGAR_VAULT,
      registry: process.env.PAGAR_REGISTRY,
      agent: process.env.PAGAR_AGENT,
      token: "0x456569838f1d43009A91ebA4263147Afd7233483",
      deployBlock: process.env.PAGAR_DEPLOY_BLOCK ?? "0",
      llmAvailable: !!process.env.LLM_API_KEY,
    });
  try {
    const root =
      path.basename(process.cwd()) === "web"
        ? path.resolve("..")
        : process.cwd();
    const config = JSON.parse(
      await readFile(path.join(root, ".local/deployment.json"), "utf8"),
    );
    return Response.json({
      ...config,
      network: "local",
      chainId: 31337,
      rpc: "http://127.0.0.1:8545",
      llmAvailable: !!process.env.LLM_API_KEY,
    });
  } catch {
    return Response.json({
      network: "local",
      chainId: 31337,
      rpc: "http://127.0.0.1:8545",
      deployBlock: "0",
      llmAvailable: !!process.env.LLM_API_KEY,
    });
  }
}

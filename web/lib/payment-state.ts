import {
  registryAbi,
  vaultAbi,
  tokenAbi,
  reasons,
  reviewAutonomy,
  type Invoice,
  type AgentPolicy,
} from "@cleared/sdk";
import { reader, requireContracts, type Config } from "./client";

export async function readPaymentState(config: Config, invoices: Invoice[]) {
  requireContracts(config);
  const client = reader(config);
  if ((await client.getChainId()) !== config.chainId)
    throw new Error("RPC chain does not match the configuration.");
  const [grant, frozen, dailyRemaining, block, balance] = await Promise.all([
    client.readContract({
      address: config.vault,
      abi: vaultAbi,
      functionName: "agents",
      args: [config.agent],
    }),
    client.readContract({
      address: config.vault,
      abi: vaultAbi,
      functionName: "frozen",
    }),
    client.readContract({
      address: config.vault,
      abi: vaultAbi,
      functionName: "dailyRemaining",
    }),
    client.getBlock(),
    client.readContract({
      address: config.token,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [config.vault],
    }),
  ]);
  const [totalLimit, perItemLimit, spent, expiresAt, version, revoked] = grant;
  const policy: AgentPolicy = {
    totalLimit,
    perItemLimit,
    spent,
    expiresAt: BigInt(expiresAt),
    version: BigInt(version),
    revoked,
  };
  let planned = 0n;
  const seen = new Set<string>();
  const items = [];
  for (const invoice of invoices) {
    const [verified, holdSeconds, contractReason] = await Promise.all([
      client.readContract({
        address: config.registry,
        abi: registryAbi,
        functionName: "isVerified",
        args: [invoice.name, invoice.payee],
      }),
      client.readContract({
        address: config.registry,
        abi: registryAbi,
        functionName: "holdRemaining",
        args: [invoice.name, invoice.payee],
      }),
      client.readContract({
        address: config.vault,
        abi: vaultAbi,
        functionName: "previewPayment",
        args: [config.agent, invoice, false],
      }),
    ]);
    let decision = reviewAutonomy(
      invoice,
      verified,
      { ...policy, spent: spent + planned },
      block.timestamp,
      {
        frozen,
        holdSeconds,
        dailyRemaining:
          dailyRemaining > planned ? dailyRemaining - planned : 0n,
      },
    );
    if (contractReason !== 0) {
      decision = reasons[contractReason] ?? "Rejected";
    }
    if (seen.has(invoice.ref)) decision = "Duplicate reference in batch";
    seen.add(invoice.ref);
    if (decision === reasons[0] && planned + invoice.amount > balance)
      decision = reasons[8];
    if (decision === "Verified") planned += invoice.amount;
    items.push({ verified, holdSeconds, decision, contractReason });
  }
  return { policy, frozen, dailyRemaining, timestamp: block.timestamp, items };
}

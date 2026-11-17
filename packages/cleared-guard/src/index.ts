import { registryAbi } from "@cleared/sdk";
import { type Address, type PublicClient } from "viem";

/** Preflight only. Recheck identity inside the paying contract on every payment. */
export async function isClearedPayee(
  client: PublicClient,
  registry: Address,
  name: string,
  account: Address,
): Promise<boolean> {
  return client.readContract({
    address: registry,
    abi: registryAbi,
    functionName: "isVerified",
    args: [name, account],
  });
}
export async function assertClearedPayee(
  client: PublicClient,
  registry: Address,
  name: string,
  account: Address,
): Promise<void> {
  if (!(await isClearedPayee(client, registry, name, account)))
    throw new Error("UnclearedPayee: name/address mismatch");
}

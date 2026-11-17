import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  isAddress,
  type Address,
  type EIP1193Provider,
  type WalletClient,
} from "viem";
import { aevum, local } from "@cleared/sdk";
export interface Config {
  network: "local" | "aevum" | "demo";
  chainId: number;
  rpc: string;
  vault?: Address;
  registry?: Address;
  agent?: Address;
  owner?: Address;
  token?: Address;
  deployBlock: string;
  llmAvailable: boolean;
}
export const chainFor = (c: Config) => (c.network === "local" ? local : aevum);
export const reader = (c: Config) =>
  createPublicClient({
    chain: chainFor(c),
    transport: http(
      c.network === "local"
        ? "http://127.0.0.1:8545"
        : aevum.rpcUrls.default.http[0],
    ),
  });
export function requireContracts(c: Config): asserts c is Config & {
  vault: Address;
  registry: Address;
  agent: Address;
  token: Address;
} {
  if (
    !c.vault ||
    !c.registry ||
    !c.agent ||
    !c.token ||
    ![c.vault, c.registry, c.agent, c.token].every((a) => isAddress(a))
  )
    throw new Error(
      "Contracts are not configured. Run npm run demo from the project root.",
    );
}
export async function connectWallet(
  c: Config,
  localOwner = false,
): Promise<WalletClient> {
  if (localOwner) {
    if (c.network !== "local" || !c.owner)
      throw new Error("The Anvil owner is only available locally.");
    if ((await reader(c).getChainId()) !== 31337)
      throw new Error("Local RPC is not Anvil chain 31337.");
    return createWalletClient({
      chain: local,
      account: c.owner,
      transport: http("http://127.0.0.1:8545"),
    });
  }
  const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
  if (!provider)
    throw new Error(
      "No browser wallet found. Use the Anvil owner for a local demo.",
    );
  const wallet = createWalletClient({
    chain: chainFor(c),
    transport: custom(provider),
  });
  const [account] = await wallet.requestAddresses();
  if ((await wallet.getChainId()) !== c.chainId) {
    try {
      await wallet.switchChain({ id: c.chainId });
    } catch {
      await wallet.addChain({ chain: chainFor(c) });
      await wallet.switchChain({ id: c.chainId });
    }
  }
  return createWalletClient({
    account,
    chain: chainFor(c),
    transport: custom(provider),
  });
}

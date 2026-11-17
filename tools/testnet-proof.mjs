// Explicit opt-in only. Never invoked by build, tests, samples or the demo.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  toBytes,
  zeroAddress,
  zeroHash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  aevum,
  TUSD8,
  vaultAbi,
  registryAbi,
  tokenAbi,
  invoiceRef,
} from "@cleared/sdk";

const rpc = "https://rpc-test.qday.info";
const explorer = "https://explorer-test.qday.info";
const registryWrites = parseAbi([
  "function owner() view returns (address)",
  "function register(string name, address account, bytes32 documentHash)",
]);
const tokenReads = parseAbi([
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);
const equal = (a, b) => a.toLowerCase() === b.toLowerCase();

export function proofSettings(env) {
  if (env.CLEARED_PROOF_BROADCAST !== "aevum-testnet")
    throw new Error(
      "Set CLEARED_PROOF_BROADCAST=aevum-testnet only when ready to broadcast test-token transactions.",
    );
  for (const name of ["DEPLOYER_PRIVATE_KEY", "PROOF_AGENT_PRIVATE_KEY"])
    if (!/^0x[\da-fA-F]{64}$/.test(env[name] ?? ""))
      throw new Error(`Missing or invalid ${name}.`);
  for (const name of [
    "CLEARED_VAULT",
    "CLEARED_REGISTRY",
    "PROOF_TRUSTED_PAYEE",
    "PROOF_HELD_PAYEE",
    "PROOF_LOOKALIKE_PAYEE",
  ])
    if (!isAddress(env[name] ?? "") || equal(env[name], zeroAddress))
      throw new Error(`Missing or invalid ${name}.`);
  if (!/^[a-zA-Z0-9-]{1,48}$/.test(env.PROOF_RUN_ID ?? ""))
    throw new Error(
      "Set a unique PROOF_RUN_ID (1 to 48 letters, digits or hyphens). Never reuse a run ID.",
    );
  const destinations = [
    env.PROOF_TRUSTED_PAYEE,
    env.PROOF_HELD_PAYEE,
    env.PROOF_LOOKALIKE_PAYEE,
  ].map((value) => getAddress(value));
  if (new Set(destinations.map((a) => a.toLowerCase())).size !== 3)
    throw new Error("Proof destinations must differ.");
  return {
    vault: getAddress(env.CLEARED_VAULT),
    registry: getAddress(env.CLEARED_REGISTRY),
    trusted: destinations[0],
    held: destinations[1],
    lookalike: destinations[2],
    run: env.PROOF_RUN_ID,
    trustedName: "Northwind Design Studio",
    heldName: `Ledgerline Audits proof ${env.PROOF_RUN_ID}`,
  };
}

export async function runProof(env = process.env) {
  const settings = proofSettings(env);
  const owner = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY);
  const agent = privateKeyToAccount(env.PROOF_AGENT_PRIVATE_KEY);
  assert(
    !equal(owner.address, agent.address),
    "Use a dedicated proof agent, different from the owner.",
  );
  const transport = http(rpc, { timeout: 10_000, retryCount: 0 });
  const client = createPublicClient({ chain: aevum, transport });
  const ownerWallet = createWalletClient({
    account: owner,
    chain: aevum,
    transport,
  });
  const agentWallet = createWalletClient({
    account: agent,
    chain: aevum,
    transport,
  });
  const read = (address, abi, functionName, args = []) =>
    client.readContract({ address, abi, functionName, args });
  const records = [];
  let complete = false;
  async function save() {
    await mkdir("docs", { recursive: true });
    const table = records
      .map(
        (r) =>
          `| ${r.scenario} | ${r.observation} | [${r.hash}](${explorer}/tx/${r.hash}) |`,
      )
      .join("\n");
    await writeFile(
      "docs/TESTNET-PROOF.md",
      `# Aevum testnet proof\n\nRun: ${settings.run}. Chain: 44005. ${complete ? "All six scenarios verified." : "INCOMPLETE: only the confirmed rows below are evidence."}\n\nVault: [${settings.vault}](${explorer}/address/${settings.vault}). Registry: [${settings.registry}](${explorer}/address/${settings.registry}).\n\n| Scenario | Verified observation | Transaction / explorer |\n| --- | --- | --- |\n${table}\n\nOnly confirmed successful receipts with decoded expected events or checked state are recorded. Setup and staging rows are supporting evidence. All writes use legacy type 0.\n`,
    );
  }
  async function write(
    wallet,
    address,
    abi,
    functionName,
    args,
    scenario,
    verify,
  ) {
    const hash = await wallet.writeContract({
      address,
      abi,
      functionName,
      args,
      type: "legacy",
    });
    const receipt = await client.waitForTransactionReceipt({
      hash,
      timeout: 120_000,
    });
    assert.equal(receipt.status, "success", `${scenario}: reverted`);
    const observation = await verify(receipt);
    records.push({ scenario, observation, hash });
    await save();
    return receipt;
  }
  const events = (receipt, eventName) =>
    receipt.logs
      .filter((log) => equal(log.address, settings.vault))
      .flatMap((log) => {
        try {
          const event = decodeEventLog({
            abi: vaultAbi,
            data: log.data,
            topics: log.topics,
          });
          return event.eventName === eventName ? [event.args] : [];
        } catch {
          return [];
        }
      });

  // Complete all read-only preconditions before any transaction is sent.
  assert.equal(await client.getChainId(), 44005, "Aevum testnet only.");
  assert(
    equal(await read(settings.vault, vaultAbi, "owner"), owner.address),
    "Deployer must own vault.",
  );
  assert(
    equal(
      await read(settings.registry, registryWrites, "owner"),
      owner.address,
    ),
    "Deployer must own registry.",
  );
  assert(
    equal(await read(settings.vault, vaultAbi, "registry"), settings.registry),
    "Vault registry differs.",
  );
  assert(
    equal(await read(settings.vault, vaultAbi, "token"), TUSD8),
    "Vault must use public tUSD8.",
  );
  assert.equal(await read(TUSD8, tokenReads, "decimals"), 6);
  assert.equal(
    await read(settings.vault, vaultAbi, "frozen"),
    false,
    "Unfreeze deliberately before proof.",
  );
  assert.equal(
    await read(settings.registry, registryAbi, "isVerified", [
      settings.trustedName,
      settings.trusted,
    ]),
    true,
    "Register trusted contractor first.",
  );
  assert.equal(
    await read(settings.registry, registryAbi, "holdRemaining", [
      settings.trustedName,
      settings.trusted,
    ]),
    0n,
    "Wait the full 24-hour trust delay before proof.",
  );
  const heldRecord = await read(settings.registry, registryAbi, "payees", [
    keccak256(toBytes(settings.heldName)),
  ]);
  assert.equal(
    heldRecord[2],
    0n,
    "Held proof name must be unused; choose a new run ID.",
  );
  assert(
    (await read(TUSD8, tokenAbi, "balanceOf", [owner.address])) >= 1_000_000n,
    "Owner needs at least 1 tUSD8.",
  );
  assert(
    (await read(settings.vault, vaultAbi, "dailyRemaining")) >= 300_000n,
    "Daily budget needs 0.30 tUSD8 remaining.",
  );
  assert(
    (await client.getBalance({ address: owner.address })) > 0n,
    "Owner needs test gas.",
  );
  assert(
    (await client.getBalance({ address: agent.address })) > 0n,
    "Agent needs test gas.",
  );
  const makeItem = (tag, name, payee) => ({
    ref: invoiceRef(name, `proof-${settings.run}-${tag}`),
    name,
    payee,
    amount: 100_000n,
    invoiceHash: keccak256(toBytes(`cleared-proof/${settings.run}/${tag}`)),
  });
  const trusted = makeItem("trusted", settings.trustedName, settings.trusted);
  const held = makeItem("held", settings.heldName, settings.held);
  const lookalike = makeItem(
    "lookalike",
    settings.trustedName,
    settings.lookalike,
  );
  for (const item of [trusted, held, lookalike])
    assert.equal(
      await read(settings.vault, vaultAbi, "paidRefs", [item.ref]),
      false,
      "Proof reference already paid.",
    );

  await write(
    ownerWallet,
    TUSD8,
    tokenAbi,
    "approve",
    [settings.vault, 1_000_000n],
    "Setup: allowance",
    async () => {
      assert.equal(
        await read(TUSD8, tokenReads, "allowance", [
          owner.address,
          settings.vault,
        ]),
        1_000_000n,
      );
      return "1 tUSD8 allowance confirmed";
    },
  );
  const beforeDeposit = await read(TUSD8, tokenAbi, "balanceOf", [
    settings.vault,
  ]);
  await write(
    ownerWallet,
    settings.vault,
    vaultAbi,
    "deposit",
    [1_000_000n],
    "1. Deposit",
    async () => {
      assert.equal(
        await read(TUSD8, tokenAbi, "balanceOf", [settings.vault]),
        beforeDeposit + 1_000_000n,
      );
      return "Vault balance increased by 1 tUSD8";
    },
  );
  const now = (await client.getBlock()).timestamp;
  await write(
    ownerWallet,
    settings.vault,
    vaultAbi,
    "configureAgent",
    [agent.address, 1_000_000n, 200_000n, now + 86400n],
    "Setup: dedicated grant",
    async () => {
      const grant = await read(settings.vault, vaultAbi, "agents", [
        agent.address,
      ]);
      assert.equal(grant[5], false);
      return "Dedicated proof agent granted 1 tUSD8 total / 0.20 per invoice";
    },
  );
  async function stage(item, tag) {
    let batch;
    await write(
      agentWallet,
      settings.vault,
      vaultAbi,
      "stageBatch",
      [[item]],
      `Stage: ${tag}`,
      async (receipt) => {
        const staged = events(receipt, "Staged");
        assert.equal(staged.length, 1);
        batch = staged[0].batchId;
        return `Immutable batch ${batch}`;
      },
    );
    return batch;
  }
  async function execute(wallet, batch, item, label, reason) {
    return write(
      wallet,
      settings.vault,
      vaultAbi,
      wallet === ownerWallet ? "approveAndExecute" : "agentExecute",
      [batch],
      label,
      async (receipt) => {
        const decoded = events(
          receipt,
          reason === undefined ? "Paid" : "Rejected",
        );
        assert.equal(decoded.length, 1);
        const event = decoded[0];
        assert.equal(event.batchId, batch);
        assert.equal(event.ref, item.ref);
        if (reason === undefined) {
          assert(equal(event.payee, item.payee));
          assert.equal(event.amount, item.amount);
          assert.equal(event.invoiceHash, item.invoiceHash);
          return "Paid 0.10 tUSD8 to the expected recipient";
        }
        assert.equal(event.reason, reason);
        assert.equal(events(receipt, "Paid").length, 0);
        return reason === 9
          ? "Rejected: PayeeOnHold (9)"
          : "Rejected: NameMismatch (1)";
      },
    );
  }
  await execute(
    agentWallet,
    await stage(trusted, "trusted"),
    trusted,
    "2. Auto-pay trusted contractor",
  );
  await write(
    ownerWallet,
    settings.registry,
    registryWrites,
    "register",
    [settings.heldName, settings.held, zeroHash],
    "Setup: new recipient",
    async () => {
      assert(
        (await read(settings.registry, registryAbi, "holdRemaining", [
          settings.heldName,
          settings.held,
        ])) > 0n,
      );
      return "New recipient has a nonzero trust hold";
    },
  );
  await execute(
    agentWallet,
    await stage(held, "held"),
    held,
    "3. Hold new recipient",
    9,
  );
  await execute(
    agentWallet,
    await stage(lookalike, "lookalike"),
    lookalike,
    "4. Refuse lookalike",
    1,
  );
  // Executed batches are single use; restage the same unpaid held reference.
  await execute(
    ownerWallet,
    await stage(held, "owner approval"),
    held,
    "5. Owner approves held recipient",
  );
  await write(
    ownerWallet,
    settings.vault,
    vaultAbi,
    "revokeAgent",
    [agent.address],
    "6. Revoke",
    async (receipt) => {
      assert.equal(
        await read(settings.vault, vaultAbi, "previewPayment", [
          agent.address,
          makeItem("revoked", settings.trustedName, settings.trusted),
          false,
        ]),
        5,
      );
      assert.equal(
        (await read(settings.vault, vaultAbi, "agents", [agent.address]))[5],
        true,
      );
      const revoked = events(receipt, "AgentRevoked");
      assert.equal(revoked.length, 1);
      assert(equal(revoked[0].agent, agent.address));
      return "AgentRevoked confirmed; preview refuses payment with Revoked (5)";
    },
  );
  complete = true;
  await save();
  console.log("Six Aevum scenarios verified. Evidence: docs/TESTNET-PROOF.md");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await runProof();

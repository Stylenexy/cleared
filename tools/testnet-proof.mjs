// Explicit opt-in only. Never invoked by build, tests, samples or the demo.
import assert from "node:assert/strict";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
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

const defaultRpc = "https://rpc-test.qday.info";
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
  if (
    env.CLEARED_PROOF_RPC !== undefined &&
    !/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(env.CLEARED_PROOF_RPC)
  )
    throw new Error("CLEARED_PROOF_RPC may only point to a loopback fork.");
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
    // Rehearsal only: a loopback fork of Aevum testnet (anvil --fork-url). Never a remote URL.
    rpc: env.CLEARED_PROOF_RPC ?? defaultRpc,
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
  // Reads retry transient RPC errors; writes are never resent automatically.
  const readTransport = http(settings.rpc, { timeout: 20_000, retryCount: 3 });
  const writeTransport = http(settings.rpc, { timeout: 30_000, retryCount: 0 });
  const client = createPublicClient({ chain: aevum, transport: readTransport });
  const ownerWallet = createWalletClient({
    account: owner,
    chain: aevum,
    transport: writeTransport,
  });
  const agentWallet = createWalletClient({
    account: agent,
    chain: aevum,
    transport: writeTransport,
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
      `# Aevum testnet proof\n\nRun: ${settings.run}. Chain: 44005. ${complete ? "All seven scenarios verified." : "INCOMPLETE: only the confirmed rows below are evidence."}\n\nVault: [${settings.vault}](${explorer}/address/${settings.vault}). Registry: [${settings.registry}](${explorer}/address/${settings.registry}).\n\n| Scenario | Verified observation | Transaction / explorer |\n| --- | --- | --- |\n${table}\n\nOnly confirmed successful receipts with decoded expected events or checked state are recorded. Setup and staging rows are supporting evidence. All writes use legacy type 0.\n`,
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
    // Record every broadcast hash before waiting, so an RPC failure never loses evidence.
    console.log(`sent  ${scenario}: ${hash}`);
    await mkdir(".local", { recursive: true });
    await appendFile(
      ".local/proof-sent.log",
      `${new Date().toISOString()} ${settings.run} ${scenario} ${hash}
`,
    );
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
  // Owner sends 8 transactions and the agent 9; budget 3M gas each at the current price.
  const gasPrice = await client.getGasPrice();
  assert(
    (await client.getBalance({ address: owner.address })) >=
      gasPrice * 3_000_000n * 8n,
    "Owner needs more test gas for 8 transactions.",
  );
  assert(
    (await client.getBalance({ address: agent.address })) >=
      gasPrice * 3_000_000n * 9n,
    "Agent needs more test gas for 9 transactions.",
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
  const trustedAgain = makeItem(
    "trusted-2",
    settings.trustedName,
    settings.trusted,
  );
  const frozenItem = makeItem("frozen", settings.trustedName, settings.trusted);
  for (const item of [trusted, held, lookalike, trustedAgain, frozenItem])
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
  async function stage(itemOrItems, tag) {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    let batch;
    await write(
      agentWallet,
      settings.vault,
      vaultAbi,
      "stageBatch",
      [items],
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
          : reason === 10
            ? "Rejected: Frozen (10), kill switch on"
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
  // One agent batch with the real contractor and its lookalike: one Paid, one Rejected.
  const mixedBatch = await stage([trustedAgain, lookalike], "verified + lookalike");
  await write(
    agentWallet,
    settings.vault,
    vaultAbi,
    "agentExecute",
    [mixedBatch],
    "4. Same batch: verified paid, lookalike refused",
    async (receipt) => {
      const paid = events(receipt, "Paid");
      const rejected = events(receipt, "Rejected");
      assert.equal(paid.length, 1);
      assert.equal(rejected.length, 1);
      assert.equal(paid[0].batchId, mixedBatch);
      assert.equal(paid[0].ref, trustedAgain.ref);
      assert(equal(paid[0].payee, settings.trusted));
      assert.equal(paid[0].amount, trustedAgain.amount);
      assert.equal(rejected[0].batchId, mixedBatch);
      assert.equal(rejected[0].ref, lookalike.ref);
      assert.equal(rejected[0].reason, 1);
      return "Paid 0.10 tUSD8 to the verified address; lookalike Rejected: NameMismatch (1)";
    },
  );
  // Executed batches are single use; restage the same unpaid held reference.
  await execute(
    ownerWallet,
    await stage(held, "owner approval"),
    held,
    "5. Owner approves held recipient",
  );
  // Kill switch: a staged payment to a verified, mature contractor is refused while frozen.
  const frozenBatch = await stage(frozenItem, "kill switch");
  try {
    await write(
      ownerWallet,
      settings.vault,
      vaultAbi,
      "setFrozen",
      [true],
      "Setup: kill switch on",
      async () => {
        assert.equal(await read(settings.vault, vaultAbi, "frozen"), true);
        return "Vault frozen";
      },
    );
    await execute(
      agentWallet,
      frozenBatch,
      frozenItem,
      "6. Kill switch blocks payment",
      10,
    );
  } finally {
    if (await read(settings.vault, vaultAbi, "frozen"))
      await write(
        ownerWallet,
        settings.vault,
        vaultAbi,
        "setFrozen",
        [false],
        "Setup: kill switch off",
        async () => {
          assert.equal(await read(settings.vault, vaultAbi, "frozen"), false);
          return "Vault resumed";
        },
      );
  }
  await write(
    ownerWallet,
    settings.vault,
    vaultAbi,
    "revokeAgent",
    [agent.address],
    "7. Revoke agent key",
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
  console.log("Seven Aevum scenarios verified. Evidence: docs/TESTNET-PROOF.md");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await runProof();

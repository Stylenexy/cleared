"use client";
import { useEffect, useState } from "react";
import {
  encodeFunctionData,
  isAddress,
  type WalletClient,
  type Address,
  type Hash,
} from "viem";
import {
  amount6,
  displayAmount,
  vaultAbi,
  freeze,
  type AgentPolicy,
} from "@cleared/sdk";
import {
  reader,
  connectWallet,
  requireContracts,
  type Config,
} from "../../../lib/client";
import { AppShell } from "../../components/app-shell/app-shell";
import { PageHeader, MeterBar, RingGauge } from "../../components/app-shell/ui";
export default function Keys() {
  const [config, setConfig] = useState<Config>(),
    [wallet, setWallet] = useState<WalletClient>(),
    [policy, setPolicy] = useState<AgentPolicy>();
  const [agent, setAgent] = useState(""),
    [total, setTotal] = useState("1"),
    [perItem, setPerItem] = useState("0.5"),
    [hours, setHours] = useState("24"),
    [daily, setDaily] = useState("1");
  const [dailyLimit, setDailyLimit] = useState<bigint>();
  const [frozen, setFrozen] = useState(false),
    [remaining, setRemaining] = useState<bigint>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [hash, setHash] = useState<Hash>();
  async function refresh(c: Config, a: string) {
    requireContracts(c);
    if (!isAddress(a)) throw new Error("Invalid agent address.");
    const client = reader(c);
    if ((await client.getChainId()) !== c.chainId)
      throw new Error("RPC chain mismatch.");
    const [grant, f, limit, r] = await Promise.all([
      client.readContract({
        address: c.vault,
        abi: vaultAbi,
        functionName: "agents",
        args: [a],
      }),
      client.readContract({
        address: c.vault,
        abi: vaultAbi,
        functionName: "frozen",
      }),
      client.readContract({
        address: c.vault,
        abi: vaultAbi,
        functionName: "dailyLimit",
      }),
      client.readContract({
        address: c.vault,
        abi: vaultAbi,
        functionName: "dailyRemaining",
      }),
    ]);
    const [totalLimit, perItemLimit, spent, expiresAt, version, revoked] =
      grant;
    setPolicy({
      totalLimit,
      perItemLimit,
      spent,
      expiresAt: BigInt(expiresAt),
      version: BigInt(version),
      revoked,
    });
    setFrozen(f);
    setDaily(displayAmount(limit));
    setDailyLimit(limit);
    setRemaining(r);
  }
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(async (c: Config) => {
        setConfig(c);
        setAgent(c.agent ?? "");
        if (c.vault && c.agent) await refresh(c, c.agent);
      })
      .catch(() =>
        setError("Could not read contract controls. Check the configured RPC."),
      );
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function owner() {
    if (!config || !wallet?.account)
      throw new Error("Connect the owner wallet first.");
    requireContracts(config);
    const client = reader(config);
    if ((await client.getChainId()) !== config.chainId)
      throw new Error("RPC chain mismatch.");
    const o = await client.readContract({
      address: config.vault,
      abi: vaultAbi,
      functionName: "owner",
    });
    if (o.toLowerCase() !== wallet.account.address.toLowerCase())
      throw new Error("Only the vault owner can change controls.");
    return { c: config, w: wallet };
  }
  async function confirmed(tx: Hash) {
    setHash(tx);
    if (!config) return;
    const receipt = await reader(config).waitForTransactionReceipt({
      hash: tx,
    });
    if (receipt.status !== "success")
      throw new Error("Control update reverted.");
    await refresh(config, agent);
  }
  async function toggleFreeze() {
    const { c, w } = await owner();
    await confirmed(await freeze(w, c.vault!, !frozen));
  }
  async function mutate(action: "grant" | "revoke" | "daily") {
    const { c, w } = await owner();
    if (!isAddress(agent)) throw new Error("Invalid agent address.");
    let data: Hash;
    if (action === "revoke")
      data = encodeFunctionData({
        abi: vaultAbi,
        functionName: "revokeAgent",
        args: [agent as Address],
      });
    else if (action === "daily")
      data = encodeFunctionData({
        abi: vaultAbi,
        functionName: "setDailyLimit",
        args: [amount6(daily)],
      });
    else {
      const t = amount6(total),
        p = amount6(perItem),
        h = Number(hours);
      if (p > t || !Number.isInteger(h) || h < 1 || h > 8760)
        throw new Error(
          "Per-invoice cap must be at most the total; expiry must be 1 to 8,760 hours.",
        );
      const expires =
        (await reader(c).getBlock()).timestamp + BigInt(h) * 3600n;
      data = encodeFunctionData({
        abi: vaultAbi,
        functionName: "configureAgent",
        args: [agent as Address, t, p, expires],
      });
    }
    await confirmed(
      await w.sendTransaction({
        account: w.account!,
        chain: w.chain,
        to: c.vault!,
        data,
        type: "legacy",
      }),
    );
  }
  return (
    <AppShell
      active="/app/keys"
      config={config}
      frozen={policy ? frozen : undefined}
    >
      <main className="desk controls-page">
        <PageHeader
          title="Controls"
          description="Manage agent access, spending limits and emergency controls."
        />
        {error && (
          <p role="alert" className="notice danger">
            {error}
          </p>
        )}
        {busy && <p role="status">Updating controls...</p>}
        <div className="actions">
          <button
            disabled={busy || !config?.vault}
            onClick={() =>
              run(async () => {
                if (config) setWallet(await connectWallet(config));
              })
            }
          >
            Connect owner wallet
          </button>
          {config?.network === "local" && (
            <button
              disabled={busy || !config.owner}
              onClick={() =>
                run(async () => setWallet(await connectWallet(config, true)))
              }
            >
              Use Anvil owner
            </button>
          )}
        </div>
        <p className="hash">
          {wallet?.account?.address ?? "No owner wallet connected."}
        </p>
        <section className="settings-row">
          <div className="settings-label">
            <h2>Agent key</h2>
            <p>
              Manage the agent allowed to pay contractor invoices, with spending
              limits and an expiry.
            </p>
          </div>
          <div className="app-card key-panel">
            <label>
              Agent address
              <input
                value={agent}
                spellCheck={false}
                onChange={(e) => {
                  setAgent(e.target.value);
                  setPolicy(undefined);
                }}
              />
            </label>
            <button
              disabled={busy || !config?.vault}
              onClick={() =>
                run(async () => {
                  if (config) await refresh(config, agent);
                })
              }
            >
              Refresh controls
            </button>
            {policy ? (
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {policy.version === 0n
                      ? "Not authorized"
                      : policy.revoked
                        ? "Revoked"
                        : Number(policy.expiresAt) * 1000 <= Date.now()
                          ? "Expired"
                          : "Active"}
                  </dd>
                </div>
                <div>
                  <dt>Total / spent</dt>
                  <dd>
                    {displayAmount(policy.totalLimit)} /{" "}
                    {displayAmount(policy.spent)} tUSD8
                  </dd>
                </div>
                <div>
                  <dt>Remaining grant</dt>
                  <dd>
                    {displayAmount(policy.totalLimit - policy.spent)} tUSD8
                  </dd>
                </div>
                <div>
                  <dt>Per invoice</dt>
                  <dd>{displayAmount(policy.perItemLimit)} tUSD8</dd>
                </div>
                <div>
                  <dt>Expires</dt>
                  <dd>
                    {policy.expiresAt > 0n
                      ? new Date(
                          Number(policy.expiresAt) * 1000,
                        ).toLocaleString("en-US")
                      : "Not configured"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p>No agent policy read yet.</p>
            )}
            {policy && (
              <MeterBar
                value={Number(policy.spent)}
                max={Number(policy.totalLimit)}
                label="Agent grant spent"
              />
            )}
            <div className="form-grid">
              <label>
                Total grant (tUSD8)
                <input
                  value={total}
                  inputMode="decimal"
                  onChange={(e) => setTotal(e.target.value)}
                />
              </label>
              <label>
                Per invoice (tUSD8)
                <input
                  value={perItem}
                  inputMode="decimal"
                  onChange={(e) => setPerItem(e.target.value)}
                />
              </label>
              <label>
                Expiry (hours)
                <input
                  type="number"
                  min="1"
                  max="8760"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </label>
            </div>
            <p>
              A new grant resets grant spend and invalidates pending batches
              from the old grant. Revocation blocks both automatic and
              owner-approved execution.
            </p>
            <div className="actions">
              <button
                disabled={busy || !wallet}
                className="primary"
                onClick={() => run(() => mutate("grant"))}
              >
                Save new grant
              </button>
            </div>
            {hash && (
              <p>
                Transaction:{" "}
                {config?.network === "aevum" ? (
                  <a
                    className="hash"
                    href={"https://explorer-test.qday.info/tx/" + hash}
                  >
                    {hash}
                  </a>
                ) : (
                  <code>{hash} (local)</code>
                )}
              </p>
            )}
          </div>
        </section>
        <section className="settings-row">
          <div className="settings-label">
            <h2>Daily budget</h2>
            <p>
              Set the total amount the agent can spend each day across all
              invoice payments.
            </p>
          </div>
          <div className="app-card key-panel budget-card">
            {remaining !== undefined && dailyLimit !== undefined && (
              <RingGauge
                value={Number(remaining) / 1_000_000}
                max={Number(dailyLimit) / 1_000_000}
                label={
                  displayAmount(remaining) +
                  " of " +
                  displayAmount(dailyLimit) +
                  " tUSD8 left today"
                }
              />
            )}
            <div className="budget-fields">
              <p>
                Resets at 00:00 UTC, across all agents. A new agent grant does
                not reset daily spend.
              </p>
              <p>
                Remaining today:{" "}
                {remaining === undefined
                  ? "Not read"
                  : displayAmount(remaining) + " tUSD8"}
              </p>
              <label>
                Daily cap (tUSD8)
                <input
                  inputMode="decimal"
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !wallet}
                onClick={() => run(() => mutate("daily"))}
              >
                Save daily cap
              </button>
            </div>
          </div>
        </section>
        <section className="settings-row danger-zone">
          <div className="settings-label">
            <h2>Danger zone</h2>
            <p>Emergency controls that stop payments and revoke access.</p>
          </div>
          <div className="app-card">
            <div className="danger-control">
              <h2>Kill switch</h2>
              <p>
                {frozen
                  ? "Frozen. Every agent-originated payment is blocked, including owner-approved batches."
                  : "Payments enabled. Only invoices allowed by the contract can settle."}
              </p>
              <button
                className="destructive"
                disabled={busy || !wallet || !config?.vault}
                onClick={() => run(toggleFreeze)}
              >
                {frozen ? "Resume agent payments" : "Freeze all agent payments"}
              </button>
            </div>
            <div className="danger-control">
              <h2>Revoke agent key</h2>
              <p>
                Revocation blocks both automatic and owner-approved execution.
              </p>{" "}
              <button
                className="destructive"
                disabled={busy || !wallet || !policy?.version || policy.revoked}
                onClick={() => run(() => mutate("revoke"))}
              >
                Revoke agent key
              </button>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

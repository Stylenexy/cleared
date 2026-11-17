"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createWalletClient,
  decodeEventLog,
  http,
  type WalletClient,
  type Hash,
} from "viem";
import {
  stage,
  approve,
  autoPay,
  local,
  vaultAbi,
  reconcile,
  toCsv,
  displayAmount,
  holdClock,
  type Invoice,
  type Reconciliation,
} from "@cleared/sdk";
import {
  deserializeInvoice,
  type SerializedInvoice,
} from "../../lib/invoice-wire";
import {
  reader,
  requireContracts,
  connectWallet,
  type Config,
} from "../../lib/client";
import { readPaymentState } from "../../lib/payment-state";
import { demoDecision } from "../../lib/demo";
import { ClearingFlow, DecisionStamp } from "../components/clearing-flow";
export default function Treasury() {
  const [config, setConfig] = useState<Config>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [holds, setHolds] = useState<bigint[]>([]);
  const [batch, setBatch] = useState<bigint>();
  const [wallet, setWallet] = useState<WalletClient>();
  const [rows, setRows] = useState<Reconciliation[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [tx, setTx] = useState<Hash>();
  const [llm, setLlm] = useState(false);
  const [source, setSource] = useState("Load invoices to review destinations.");
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setError("Could not load configuration."));
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
  async function check(
    items: Invoice[],
    stagedBatch: bigint | null = batch ?? null,
  ) {
    if (!config) throw new Error("Configuration is not loaded.");
    if (config.vault) {
      const state = await readPaymentState(config, items);
      const decisions = state.items.map((i) => i.decision);
      if (stagedBatch !== null) {
        const stagedHolds = await Promise.all(
          items.map((_, n) =>
            reader(config).readContract({
              address: config.vault!,
              abi: vaultAbi,
              functionName: "batchRequiresOwner",
              args: [stagedBatch, BigInt(n)],
            }),
          ),
        );
        stagedHolds.forEach((held, n) => {
          if (held && decisions[n] === "Verified")
            decisions[n] =
              "PayeeOnHold: owner approval required for this staged invoice";
        });
      }
      setLabels(decisions);
      setHolds(state.items.map((i) => i.holdSeconds));
      setSource(
        "Read from the contract. Every rule is checked again at execution.",
      );
    } else {
      setLabels(items.map((i) => demoDecision(i)));
      setHolds(items.map(() => 0n));
      setSource("Sample registry preview. No network payment is available.");
    }
  }
  async function upload(files: File[]) {
    setBatch(undefined);
    setRows([]);
    setTx(undefined);
    setLabels([]);
    setHolds([]);
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("llm", String(llm));
    const response = await fetch("/api/parse", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    const items = (data.invoices as SerializedInvoice[]).map(
      deserializeInvoice,
    );
    setInvoices(items);
    await check(items, null);
  }
  async function samples() {
    await upload(
      await Promise.all(
        ["01-kopi.txt", "02-kertas.txt", "03-beracun.txt"].map(
          async (p) =>
            new File([await fetch("/samples/" + p).then((r) => r.text())], p),
        ),
      ),
    );
  }
  async function agentWallet() {
    if (!config) throw new Error("Configuration is not loaded.");
    requireContracts(config);
    if (config.network === "local") {
      if ((await reader(config).getChainId()) !== 31337)
        throw new Error("Local chain mismatch.");
      return createWalletClient({
        account: config.agent,
        chain: local,
        transport: http("http://127.0.0.1:8545"),
      });
    }
    return connectWallet(config);
  }
  async function stageBatch() {
    if (!config) return;
    requireContracts(config);
    await check(invoices);
    const hash = await stage(await agentWallet(), config.vault, invoices);
    setTx(hash);
    const receipt = await reader(config).waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Staging reverted.");
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== config.vault.toLowerCase()) continue;
      try {
        const e = decodeEventLog({
          abi: vaultAbi,
          data: log.data,
          topics: log.topics,
        });
        if (e.eventName === "Staged") {
          setBatch(e.args.batchId);
          return;
        }
      } catch {}
    }
    throw new Error("Staged event was not found.");
  }
  async function execute(ownerApproval: boolean) {
    if (!config || batch === undefined) throw new Error("Stage a batch first.");
    requireContracts(config);
    const c = reader(config);
    const signer = ownerApproval ? wallet : await agentWallet();
    if (!signer) throw new Error("Connect the owner wallet first.");
    const [, , executed, stored] = await c.readContract({
      address: config.vault,
      abi: vaultAbi,
      functionName: "getBatch",
      args: [batch],
    });
    if (
      executed ||
      stored.length !== invoices.length ||
      stored.some(
        (i, n) =>
          i.ref !== invoices[n].ref ||
          i.invoiceHash !== invoices[n].invoiceHash ||
          i.amount !== invoices[n].amount ||
          i.name !== invoices[n].name ||
          i.payee.toLowerCase() !== invoices[n].payee.toLowerCase(),
      )
    )
      throw new Error(
        "Stored batch does not match this review, or has already executed.",
      );
    const hash = await (ownerApproval
      ? approve(signer, config.vault, batch)
      : autoPay(signer, config.vault, batch));
    setTx(hash);
    const receipt = await c.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error("Execution reverted. No payment is confirmed.");
    setRows(
      await reconcile(
        c,
        config.vault,
        invoices,
        BigInt(config.deployBlock),
        receipt.blockNumber,
        batch,
      ),
    );
    await check(invoices);
  }
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleared-reconciliation.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="desk">
      <div className="page-heading">
        <div>
          <h1>
            Treasury desk.
            <br />
            <span className="chrome">Every payment, checked.</span>
          </h1>
          <p>
            Contractor invoices, verified destinations and a bounded agent
            budget.
          </p>
        </div>
        <Link href="/app/keys">Agent controls &amp; kill switch</Link>
      </div>
      <p className="notice">
        {config?.vault
          ? config.network === "local"
            ? "Local Anvil | chain 31337"
            : "Aevum testnet | chain 44005"
          : "Demo preview | no contract configured"}
        . <Link href="/try">Try without a wallet</Link>
      </p>
      <ClearingFlow
        step={
          rows.length ? 4 : batch !== undefined ? 3 : invoices.length ? 2 : 0
        }
        busy={busy}
      />
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      {busy && <p role="status">Working...</p>}
      <section>
        <h2>1. Read invoices</h2>
        <p>
          TXT templates, CSV or text PDFs. Up to 10 files, 2 MB each, 10 PDF
          pages and 20,000 extracted characters. No scanned PDFs.
        </p>
        <div className="actions">
          <label className="button">
            Choose invoices
            <input
              aria-label="Choose invoices"
              type="file"
              multiple
              accept=".txt,.csv,.pdf"
              disabled={busy || !config}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) void run(() => upload(files));
                e.target.value = "";
              }}
            />
          </label>
          <button onClick={() => run(samples)} disabled={busy || !config}>
            Use three samples
          </button>
          <a href="/samples/invoices.csv" download>
            Download sample CSV
          </a>
        </div>
        {config?.llmAvailable && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={llm}
              onChange={(e) => setLlm(e.target.checked)}
            />
            Use live extraction (sends invoice text to the configured provider)
          </label>
        )}
      </section>
      <section>
        <h2>2. Review and stage</h2>
        <p>{source}</p>
        {batch !== undefined && (
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                setBatch(undefined);
                setRows([]);
                setTx(undefined);
                await check(invoices, null);
              })
            }
          >
            Start a fresh review
          </button>
        )}
        <ol className="invoice-list">
          {invoices.map((i, n) => (
            <li
              className="invoice"
              key={n}
              data-rejected={
                !!labels[n] &&
                labels[n] !== "Verified" &&
                !labels[n].startsWith("PayeeOnHold")
              }
            >
              <div className="receipt-title">
                <strong>
                  {i.name} | {i.reference}
                </strong>
                <span
                  className={
                    "badge " +
                    (labels[n] === "Verified"
                      ? "safe"
                      : labels[n]?.startsWith("PayeeOnHold")
                        ? "hold"
                        : labels[n]
                          ? "danger"
                          : "")
                  }
                >
                  {labels[n] ?? "Not checked"}
                </span>
              </div>
              <code>{i.payee}</code>
              <p className="amount">
                {displayAmount(i.amount)} <small>tUSD8</small>
              </p>
              {labels[n] && !labels[n].startsWith("PayeeOnHold") && (
                <div className="result-line">
                  <DecisionStamp rejected={labels[n] !== "Verified"} />
                </div>
              )}
              {holds[n] > 0n && (
                <p>
                  Hold remaining: {holdClock(holds[n])}. Refresh to read the
                  latest chain time.
                </p>
              )}
              <details>
                <summary>Document hash</summary>
                <code>{i.invoiceHash}</code>
              </details>
            </li>
          ))}
        </ol>
        {!invoices.length && (
          <div className="empty-state">
            Your clearing desk is ready. Upload an invoice or load the three
            samples to inspect every destination.
          </div>
        )}
        <p>
          New or changed recipients are held for 24 hours. A batch staged during
          a hold requires owner approval even after the timer expires. Rejected
          items in an executed batch must be staged again with a fresh review.
        </p>
        <div className="actions">
          <button
            disabled={busy || !invoices.length}
            onClick={() => run(() => check(invoices))}
          >
            Refresh checks
          </button>
          <button
            disabled={
              busy || !config?.vault || !invoices.length || batch !== undefined
            }
            onClick={() => run(stageBatch)}
          >
            Stage as agent
          </button>
        </div>
        {batch !== undefined && (
          <p className="notice">
            Batch #{batch.toString()} stored. Execution rechecks every policy.
          </p>
        )}
      </section>
      <section>
        <h2>3. Pay within policy</h2>
        <p>
          The batch agent can pay mature verified recipients without the owner.
          Owner approval can clear a hold, but cannot bypass identity, caps,
          expiry, revocation or the kill switch.
        </p>
        <div className="actions">
          <button
            className="primary"
            disabled={busy || batch === undefined || !!rows.length}
            onClick={() => run(() => execute(false))}
          >
            Pay automatically as agent
          </button>
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
          <button
            disabled={busy || batch === undefined || !wallet || !!rows.length}
            onClick={() => run(() => execute(true))}
          >
            Owner approve and execute
          </button>
        </div>
        <p className="hash">
          {wallet?.account?.address ?? "No owner wallet connected."}
        </p>
        {tx && (
          <p>
            Latest transaction:{" "}
            {config?.network === "aevum" ? (
              <a
                className="hash"
                href={"https://explorer-test.qday.info/tx/" + tx}
              >
                {tx}
              </a>
            ) : (
              <code>{tx} (local)</code>
            )}
          </p>
        )}
      </section>
      <section>
        <h2>4. Reconcile</h2>
        {rows.length ? (
          <>
            <div className="reconciliation-summary">
              <DecisionStamp rejected={false} children="RECONCILED" />
              <p>Confirmed contract events matched to invoice references.</p>
            </div>
            <div
              className="table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Confirmed reconciliation table"
            >
              <table>
                <caption className="sr-only">
                  Confirmed invoice reconciliation
                </caption>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Payee</th>
                    <th>tUSD8</th>
                    <th>Contract result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, n) => (
                    <tr key={n}>
                      <td>{r.reference}</td>
                      <td>{r.name}</td>
                      <td>{r.amount}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={exportCsv}>Export reconciliation CSV</button>
          </>
        ) : (
          <p>
            No confirmed results yet. Only contract events count as payments.
          </p>
        )}
      </section>
    </main>
  );
}

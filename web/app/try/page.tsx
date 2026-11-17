"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  displayAmount,
  holdClock,
  reviewAutonomy,
  type Invoice,
} from "@cleared/sdk";
import {
  deserializeInvoice,
  type SerializedInvoice,
} from "../../lib/invoice-wire";
import { demoPolicy, demoVerified } from "../../lib/demo";
import { readPaymentState } from "../../lib/payment-state";
import type { Config } from "../../lib/client";
import { ClearingFlow, DecisionStamp } from "../components/clearing-flow";
export default function Try() {
  const [invoices, setInvoices] = useState<Invoice[]>([]),
    [config, setConfig] = useState<Config>();
  const [frozen, setFrozen] = useState(false),
    [scenario, setScenario] = useState("trusted"),
    [hold, setHold] = useState(0n);
  const [spent, setSpent] = useState(0n),
    [paid, setPaid] = useState<string[]>([]),
    [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState(""),
    [live, setLive] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      fetch("/api/config").then((r) => r.json()),
      Promise.all(
        ["01-kopi.txt", "02-kertas.txt", "03-beracun.txt"].map(
          async (n) =>
            new File([await fetch("/samples/" + n).then((r) => r.text())], n),
        ),
      ),
    ])
      .then(async ([c, files]) => {
        setConfig(c);
        const form = new FormData();
        files.forEach((f) => form.append("files", f));
        form.append("llm", "false");
        const r = await fetch("/api/parse", { method: "POST", body: form });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setInvoices(
          (j.invoices as SerializedInvoice[]).map(deserializeInvoice),
        );
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (hold <= 0n) return;
    const timer = setInterval(
      () => setHold((h) => (h > 0n ? h - 1n : 0n)),
      1000,
    );
    return () => clearInterval(timer);
  }, [hold > 0n]);
  const demoInvoices = invoices.map((i, n) =>
    scenario === "changed" && n === 1
      ? { ...i, payee: "0x2222222222222222222222222222222222222223" as const }
      : i,
  );
  const isVerified = (i: Invoice, n: number) =>
    scenario === "changed" && n === 1 ? true : demoVerified(i);
  function changeScenario(value: string) {
    setScenario(value);
    setHold(value === "trusted" ? 0n : 86400n);
    setResults([]);
  }
  function simulate(ownerApproval: boolean) {
    let planned = spent;
    const newlyPaid = [...paid];
    const out = demoInvoices.map((i, n) => {
      let reason = reviewAutonomy(
        i,
        isVerified(i, n),
        { ...demoPolicy, spent: planned },
        1000n,
        {
          frozen,
          dailyRemaining: 1_000_000n - planned,
          holdSeconds: ownerApproval ? 0n : n === 1 ? hold : 0n,
        },
      );
      if (newlyPaid.includes(i.ref)) reason = "Reference already paid";
      if (reason === "Verified") {
        planned += i.amount;
        newlyPaid.push(i.ref);
        return "Simulated Paid";
      }
      return "Rejected: " + reason;
    });
    setSpent(planned);
    setPaid(newlyPaid);
    setResults(out);
  }
  async function readLive() {
    if (!config) return;
    setBusy(true);
    setError("");
    try {
      const state = await readPaymentState(config, invoices);
      setLive(
        state.items.map(
          (i) =>
            i.decision +
            (i.holdSeconds > 0n ? " | " + holdClock(i.holdSeconds) : ""),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aevum read failed.");
      setLive([]);
    } finally {
      setBusy(false);
    }
  }
  function exportDemo() {
    const csv = [
      ["Reference", "Payee", "tUSD8", "Simulated result"],
      ...demoInvoices.map((i, n) => [
        i.reference,
        i.name,
        displayAmount(i.amount),
        results[n] ?? "Not run",
      ]),
    ]
      .map((row) =>
        row.map((value) => '"' + value.replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleared-demo-reconciliation.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  useEffect(() => {
    if (config?.network === "aevum" && config.vault && invoices.length)
      void readLive();
  }, [config, invoices]);
  return (
    <main className="desk">
      <h1>
        Try Cleared.
        <br />
        <span className="chrome">See what clears.</span>
      </h1>
      <p>
        Three contractor invoices. Two verified destinations. One lookalike.
        Explore which payments the policy allows.
      </p>
      <p className="notice">
        Sample simulation. No tokens move, no transactions are sent, and no
        model is called.
      </p>
      <ClearingFlow
        step={results.length ? 4 : invoices.length ? 2 : 0}
        busy={!invoices.length && !error}
      />
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      <section>
        <h2>Choose the risk</h2>
        <div className="actions">
          <label>
            Second contractor{" "}
            <select
              aria-label="Recipient risk"
              value={scenario}
              onChange={(e) => changeScenario(e.target.value)}
            >
              <option value="trusted">Verified for more than 24 hours</option>
              <option value="new">Newly verified recipient</option>
              <option value="changed">Payment address changed just now</option>
            </select>
          </label>
          <button aria-pressed={frozen} onClick={() => setFrozen((f) => !f)}>
            {frozen
              ? "Resume demo payments"
              : "Kill switch: freeze demo payments"}
          </button>
        </div>
        <p>
          Daily cap: 1 tUSD8 | remaining: {displayAmount(1_000_000n - spent)}{" "}
          tUSD8 | {frozen ? "Frozen" : "Enabled"}
        </p>
        {scenario !== "trusted" && (
          <p className="notice hold">
            PayeeOnHold | {holdClock(hold)} remaining | owner approval required
          </p>
        )}
        <ol className="invoice-list">
          {demoInvoices.map((i, n) => (
            <li
              className="invoice"
              key={i.ref}
              data-rejected={!isVerified(i, n)}
              data-held={isVerified(i, n) && n === 1 && hold > 0n}
            >
              <div className="receipt-title">
                <strong>
                  {i.name} | {i.reference}
                </strong>
                <span
                  className={
                    "badge " +
                    (!isVerified(i, n)
                      ? "danger"
                      : n === 1 && hold > 0n
                        ? "hold"
                        : "safe")
                  }
                >
                  {isVerified(i, n)
                    ? n === 1 && hold > 0n
                      ? "PayeeOnHold"
                      : "Verified"
                    : "Name mismatch"}
                </span>
              </div>
              <code>{i.payee}</code>
              <p className="amount">
                {displayAmount(i.amount)} <small>tUSD8</small>
              </p>
              {results[n] && (
                <div className="result-line" role="status">
                  <DecisionStamp rejected={results[n] !== "Simulated Paid"} />
                  <span>{results[n]}</span>
                </div>
              )}
            </li>
          ))}
        </ol>
        <div className="actions">
          <button
            className="primary"
            disabled={!invoices.length}
            onClick={() => simulate(false)}
          >
            Simulate automatic payment
          </button>
          <button disabled={!invoices.length} onClick={() => simulate(true)}>
            Simulate owner approval
          </button>
          <button
            onClick={() => {
              setSpent(0n);
              setPaid([]);
              setResults([]);
              setFrozen(false);
              changeScenario("trusted");
            }}
          >
            Reset demo
          </button>
        </div>
        <p>
          Owner approval clears a hold. Identity mismatch and the kill switch
          still block payment. Daily budget resets at 00:00 UTC in the contract.
        </p>
      </section>
      {results.length > 0 && (
        <section aria-label="Simulated reconciliation">
          <h2>
            Every decision.
            <br />
            <span className="chrome">Accounted for.</span>
          </h2>
          <div className="reconciliation-summary" role="status">
            <p>
              <strong>
                {results.filter((r) => r === "Simulated Paid").length}
              </strong>
              Simulated paid
            </p>
            <p>
              <strong>
                {results.filter((r) => r !== "Simulated Paid").length}
              </strong>
              Refused
            </p>
            <p>
              Demo ledger only.
              <br />
              No transaction hash exists.
            </p>
          </div>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Demo reconciliation table"
          >
            <table>
              <caption className="sr-only">Simulated invoice outcomes</caption>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Payee</th>
                  <th scope="col">tUSD8</th>
                  <th scope="col">Simulated result</th>
                </tr>
              </thead>
              <tbody>
                {demoInvoices.map((i, n) => (
                  <tr key={i.ref}>
                    <td>{i.reference}</td>
                    <td>{i.name}</td>
                    <td>{displayAmount(i.amount)}</td>
                    <td>{results[n]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <button onClick={exportDemo}>Export demo CSV ↓</button>
            <a
              href="https://explorer-test.qday.info"
              target="_blank"
              rel="noreferrer"
            >
              Explore Aevum ↗
            </a>
          </div>
          <p className="muted">
            The explorer opens the public testnet, not a receipt for this
            simulation.
          </p>
        </section>
      )}
      <section>
        <h2>Aevum read-only checks</h2>
        {config?.network === "aevum" && config.vault ? (
          <>
            <p>
              Configured testnet contracts. These checks read current policy
              with eth_call and do not settle invoices.
            </p>
            <button disabled={busy || !invoices.length} onClick={readLive}>
              {busy ? "Reading Aevum..." : "Read Aevum contract decisions"}
            </button>
            {live.map((d, n) => (
              <p key={n}>
                {invoices[n]?.reference}: {d}
              </p>
            ))}
          </>
        ) : (
          <p>
            No Aevum deployment configured. Sample simulation above works
            without network access. Testnet evidence is pending deployment.
          </p>
        )}
      </section>
      <section>
        <h2>Take the attacker's seat.</h2>
        <p>
          Edit an invoice and hide an instruction. Compare extracted fields with
          the payment policy.
        </p>
        <a className="button" href="/attack">
          Open attack lab
        </a>{" "}
        <Link href="/app">Open treasury desk</Link>
      </section>
    </main>
  );
}

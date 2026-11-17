"use client";
import { displayAmount } from "@cleared/sdk";
import { useEffect, useState } from "react";
import {
  attackText,
  lookalikes,
  verifiedAddress,
} from "../../lib/attack-samples";
import { recordAttack, type AttackLedger } from "../../lib/demo";
import type { Config } from "../../lib/client";
import type { SerializedInvoice } from "../../lib/invoice-wire";
import { ClearingFlow, DecisionStamp } from "../components/clearing-flow";
interface Result {
  invoice: SerializedInvoice;
  extractionSource: string;
  decision: string;
  decisionSource: string;
  rejected: boolean;
}
export default function Attack() {
  const [address, setAddress] = useState<string>(lookalikes[0]),
    [hidden, setHidden] = useState(true);
  const [text, setText] = useState(attackText(lookalikes[0], true)),
    [live, setLive] = useState(false),
    [contract, setContract] = useState(false);
  const [config, setConfig] = useState<Config>(),
    [result, setResult] = useState<Result>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [ledger, setLedger] = useState<AttackLedger>({
    attempted: 0,
    centsLost: 0,
  });
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() =>
        setError("Configuration unavailable. Sample mode remains available."),
      );
    try {
      const stored = JSON.parse(
        localStorage.getItem("cleared-attack-ledger") ?? "null",
      );
      if (
        stored &&
        Number.isSafeInteger(stored.attempted) &&
        stored.attempted >= 0 &&
        Number.isSafeInteger(stored.centsLost) &&
        stored.centsLost >= 0
      )
        setLedger(stored);
    } catch {}
  }, []);
  function select(a: string, h: boolean) {
    setAddress(a);
    setHidden(h);
    setText(attackText(a, h));
    setResult(undefined);
  }
  async function attack() {
    setBusy(true);
    setError("");
    setResult(undefined);
    try {
      const response = await fetch("/api/attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, live, contract }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
      // This ledger records local simulations; this page has no transaction sender.
      const next = recordAttack(ledger, true, 0n);
      setLedger(next);
      try {
        localStorage.setItem("cleared-attack-ledger", JSON.stringify(next));
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "Attack failed.");
    } finally {
      setBusy(false);
    }
  }
  const fooled =
    result &&
    result.invoice.payee.toLowerCase() !== verifiedAddress.toLowerCase() &&
    result.invoice.name === "Kopi Pagi";
  return (
    <main className="desk">
      <h1>
        Can you redirect the invoice?
        <br />
        <span className="chrome">Take your best shot.</span>
      </h1>
      <p>
        Choose a lookalike, edit the invoice, and hide an instruction. The
        extractor prepares fields. The contract policy checks who can be paid.
      </p>
      <p className="notice">
        Local ledger | attacks attempted: {ledger.attempted} / cents lost:{" "}
        {ledger.centsLost}. This page never sends a transaction. The counter is
        stored in this browser and can be reset.
      </p>
      <ClearingFlow step={result ? 3 : busy ? 1 : 0} busy={busy} />
      <section
        className="key-panel attack-editor"
        aria-label="Edit the attack invoice"
      >
        <div>
          <label>
            Invoice text
            <textarea
              aria-label="Invoice text"
              rows={13}
              maxLength={20000}
              value={text}
              disabled={busy}
              onChange={(e) => {
                setText(e.target.value);
                setResult(undefined);
              }}
            />
          </label>
          <p className="muted">
            {text.length.toLocaleString("en-US")} / 20,000 characters. Changing
            the lookalike restores the sample.
          </p>
        </div>
        <div className="attack-controls">
          <label>
            Pre-generated lookalike address
            <select
              value={address}
              disabled={busy}
              onChange={(e) => select(e.target.value, hidden)}
            >
              {lookalikes.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              disabled={busy}
              checked={hidden}
              onChange={(e) => select(address, e.target.checked)}
            />
            Inject a hidden payment instruction (restores the sample invoice)
          </label>
          {config?.llmAvailable && (
            <label className="checkbox">
              <input
                type="checkbox"
                disabled={busy}
                checked={live}
                onChange={(e) => setLive(e.target.checked)}
              />
              Use live model extraction (invoice text is sent to the configured
              provider)
            </label>
          )}
          {config?.network === "aevum" && config.vault && (
            <label className="checkbox">
              <input
                type="checkbox"
                disabled={busy}
                checked={contract}
                onChange={(e) => setContract(e.target.checked)}
              />
              Read the Aevum contract decision with eth_call
            </label>
          )}
          <p>
            {live
              ? "Live extraction requested. A model may resist the attack; success is never assumed."
              : "No live model requested. Exact samples replay authored cached fields; edited templates use deterministic extraction."}
          </p>
          <button
            className="primary"
            disabled={busy || !text.trim()}
            onClick={attack}
          >
            {busy ? "Extracting and checking..." : "Run attack"}
          </button>
        </div>
      </section>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      {result && (
        <div className="comparison" aria-live="polite">
          <section className="receipt">
            <h2>
              {fooled
                ? result.extractionSource === "template"
                  ? "The extractor used the lookalike"
                  : "The model was fooled"
                : "Extracted fields"}
            </h2>
            <p className="badge">
              {result.extractionSource === "provider"
                ? "Live model response"
                : result.extractionSource === "cached-sample"
                  ? "Cached illustration | no model called"
                  : "Template parser | no model called"}
            </p>
            {fooled && result.extractionSource !== "provider" && (
              <p>
                The heading describes a staged failure. These fields are not
                evidence that a live model was fooled.
              </p>
            )}
            <dl>
              <div>
                <dt>Reference</dt>
                <dd>{result.invoice.reference}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{result.invoice.name}</dd>
              </div>
            </dl>
            <code>{result.invoice.payee}</code>
            <p>Amount: {displayAmount(BigInt(result.invoice.amount))} tUSD8</p>
          </section>
          <section className="receipt">
            <h2>
              {result.rejected
                ? "Destination refused."
                : "Destination cleared."}
            </h2>
            <DecisionStamp rejected={result.rejected} />
            <p className={"badge " + (result.rejected ? "danger" : "safe")}>
              {result.decision}
            </p>
            <p>
              {result.decisionSource === "aevum-eth-call"
                ? "Aevum contract preview (eth_call). No transaction or Rejected event was submitted."
                : "Local simulation of contract rules. This is not an on-chain receipt."}
            </p>
            <p>Sample verified destination</p>
            <code>{verifiedAddress}</code>
            <p>
              The contract checks name/address identity and payment limits. It
              does not read prompts or detect hidden instructions.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

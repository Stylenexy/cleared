"use client";
import { displayAmount } from "@cleared/sdk";
import { useEffect, useRef, useState } from "react";
import {
  attackText,
  lookalikes,
  verifiedAddress,
} from "../../lib/attack-samples";
import { recordAttack, type AttackLedger } from "../../lib/demo";
import type { Config } from "../../lib/client";
import type { SerializedInvoice } from "../../lib/invoice-wire";
import { AppShell } from "../components/app-shell/app-shell";
import {
  PageHeader,
  AddressDiff,
  EmptyState,
} from "../components/app-shell/ui";
import { InvoicePaper } from "../components/app-shell/invoice-paper";
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
  const [xray, setXray] = useState(false),
    [editing, setEditing] = useState(false);
  const [config, setConfig] = useState<Config>(),
    [result, setResult] = useState<Result>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [ledger, setLedger] = useState<AttackLedger>({
    attempted: 0,
    refused: 0,
    centsLost: 0,
  });
  const decisionHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() =>
        setError("Configuration unavailable. Sample mode remains available."),
      );
    try {
      const stored = JSON.parse(
        localStorage.getItem("cleared-attack-ledger-v2") ?? "null",
      );
      if (
        stored &&
        Number.isSafeInteger(stored.attempted) &&
        stored.attempted >= 0 &&
        Number.isSafeInteger(stored.refused) &&
        stored.refused >= 0 &&
        stored.refused <= stored.attempted &&
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
      const data: Result & { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
      requestAnimationFrame(() =>
        decisionHeading.current?.scrollIntoView({
          block: "nearest",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        }),
      );
      const next = recordAttack(
        ledger,
        data.rejected,
        BigInt(data.invoice.amount),
      );
      setLedger(next);
      try {
        localStorage.setItem("cleared-attack-ledger-v2", JSON.stringify(next));
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
    result.invoice.name === "Northwind Design Studio";
  return (
    <AppShell active="/attack" config={config}>
      <main className="desk attack-lab">
        <PageHeader
          title="Attack lab"
          description="Internal safety testing on a test network. Simulate invoice manipulations and inspect the payment decision."
        />
        <div className="attack-split" aria-busy={busy}>
          <section
            className="app-card invoice-editor-panel"
            aria-label="Invoice editor"
          >
            <h2>Invoice editor</h2>
            <p>
              Edit a test invoice (PDF text). X-ray reveals hidden instructions.
            </p>
            <div className="lab-toolbar" role="group" aria-label="Invoice view">
              <button data-demo="attack-xray" aria-pressed={xray} onClick={() => setXray(!xray)}>
                X-ray
              </button>
              <button
                aria-pressed={editing}
                disabled={busy}
                onClick={() => setEditing(!editing)}
              >
                Edit source
              </button>
              <span>
                {text.length.toLocaleString("en-US")} / 20,000 characters
              </span>
            </div>

            <InvoicePaper
              text={text}
              xray={xray}
              editing={editing}
              busy={busy}
              onEdit={(value) => {
                setText(value);
                setResult(undefined);
              }}
            />
          </section>
          <section
            className="app-card attack-run-panel"
            aria-label="Run an attack"
          >
            <h2>Run an attack</h2>
            <p>
              Simulate a prompt-injection / lookalike attack and see how Cleared
              handles it.
            </p>
            <div className="attack-controls key-panel">
              <label>
                Lookalike sample
                <select
                  value={address}
                  disabled={busy}
                  onChange={(e) => select(e.target.value, hidden)}
                >
                  {lookalikes.map((a, n) => (
                    <option key={a} value={a}>
                      {"Lookalike " +
                        String.fromCharCode(65 + n) +
                        " · " +
                        a.slice(0, 6) +
                        "…" +
                        a.slice(6, 10) +
                        "…" +
                        a.slice(-4) +
                        " (sample)"}
                    </option>
                  ))}
                </select>
              </label>
              <code className="hash">{address}</code>
              <label className="checkbox">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={hidden}
                  onChange={(e) => select(address, e.target.checked)}
                />
                <span>Inject a hidden instruction (restores the sample)</span>
              </label>
              {config?.llmAvailable && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    disabled={busy}
                    data-demo="attack-sample-mode"
                    checked={live}
                    onChange={(e) => setLive(e.target.checked)}
                  />
                  <span>
                    Use live extraction; send invoice text to the configured
                    provider
                  </span>
                </label>
              )}
              {config?.network === "aevum" && config.vault && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    disabled={busy}
                    data-demo="attack-contract"
                    checked={contract}
                    onChange={(e) => setContract(e.target.checked)}
                  />
                  <span>Read the contract decision with eth_call</span>
                </label>
              )}
              <p>
                {live
                  ? "Live extraction requested. The model may resist the attack."
                  : "Sample mode. Exact samples replay authored fields; edited invoices use the template parser."}
              </p>
              <button
                className="primary"
                disabled={busy || !text.trim()}
                data-demo="attack-run"
                onClick={attack}
              >
                {busy ? "Extracting and checking…" : "Run attack"}
              </button>
            </div>

            {error && (
              <p role="alert" className="notice danger">
                {error}
              </p>
            )}
            <div className="attack-result">
              <h2>Result</h2>
              {result ? (
                <>
                  <div data-demo="attack-result" className="attack-comparison">
                    <span>What the AI read</span>
                    <AddressDiff
                      address={result.invoice.payee}
                      against={verifiedAddress}
                    />
                  </div>
                  <div className="attack-comparison">
                    <span>What the contract allows</span>
                    <AddressDiff
                      address={verifiedAddress}
                      against={result.invoice.payee}
                    />
                  </div>
                  <p className="muted">
                    Sample registry comparison for Northwind Design Studio. The
                    decision below reports the selected policy source.
                  </p>
                </>
              ) : (
                <EmptyState>
                  Run an attack to compare the extracted destination with the
                  payment policy.
                </EmptyState>
              )}
              {result && (
                <div className="lab-decision" aria-live="polite">
                  <h2 ref={decisionHeading} tabIndex={-1}>
                    {result.rejected
                      ? "Destination refused."
                      : "Destination cleared."}
                  </h2>
                  <p className={result.rejected ? "refused-text" : "safe-text"}>
                    {result.decision}
                  </p>
                  <p>
                    {result.decisionSource === "aevum-eth-call"
                      ? "Read-only contract preview. No transaction submitted."
                      : "Local policy simulation. No on-chain receipt."}
                  </p>
                </div>
              )}

              {result && (
                <section
                  className="receipt extraction-receipt"
                  aria-label="Extraction details"
                >
                  <h2>
                    {fooled
                      ? "The extractor used the lookalike"
                      : "Extracted fields"}
                  </h2>
                  <p>
                    {result.extractionSource === "provider"
                      ? "Live model response"
                      : result.extractionSource === "cached-sample"
                        ? "Authored cached sample · no model called"
                        : "Template parser · no model called"}
                  </p>
                  <dl>
                    <div>
                      <dt>Reference</dt>
                      <dd>{result.invoice.reference}</dd>
                    </div>
                    <div>
                      <dt>Name</dt>
                      <dd>{result.invoice.name}</dd>
                    </div>
                    <div>
                      <dt>Destination</dt>
                      <dd>
                        <code className="hash">{result.invoice.payee}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Amount</dt>
                      <dd>
                        {displayAmount(BigInt(result.invoice.amount))} tUSD8
                      </dd>
                    </div>
                  </dl>
                  <p>
                    The contract checks identity and limits. It does not detect
                    hidden instructions.
                  </p>
                </section>
              )}
            </div>
            <section className="attempt-history" aria-label="Attempt history">
              <h2>History</h2>
              <p className="local-ledger">
                {ledger.attempted} attempts &middot; {ledger.refused} refused
                <small>
                  {ledger.centsLost} simulated cents cleared. No transaction
                  sent. Stored in this browser.
                </small>
                <small>
                  <a href="/app#ledger">See the on-chain ledger</a>
                </small>
              </p>
            </section>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { LedgerResponse, LedgerRow } from "../../../lib/ledger";
import { Arrow } from "../brand";
import { Clerk } from "./clerk";

type LedgerStatus = "loading" | "ready" | "unavailable";

export function LedgerPreview() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [status, setStatus] = useState<LedgerStatus>("loading");
  const [summary, setSummary] = useState<LedgerResponse["summary"]>();
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    let mounted = true;
    async function load() {
      try {
        const response = await fetch("/api/ledger", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Ledger unavailable");
        const data: LedgerResponse = await response.json();
        if (!Array.isArray(data.rows)) throw new Error("Ledger unavailable");
        if (!mounted) return;
        // The landing shows decisions first: paid and refused payments are the point.
        const decisions = data.rows.filter(
          (row) => row.event === "Paid" || row.event === "Rejected",
        );
        setRows((decisions.length ? decisions : data.rows).slice(0, 6));
        setSummary(data.summary);
        setStatus("ready");
      } catch {
        if (mounted) setStatus("unavailable");
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void load();
    return () => {
      mounted = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);
  return <LedgerPanel rows={rows} status={status} summary={summary} />;
}

export function ledgerLabel(row: Pick<LedgerRow, "event" | "reason" | "frozen">) {
  switch (row.event) {
    case "Paid":
      return "Paid";
    case "Rejected":
      return "Refused";
    case "Staged":
      return "Batch staged";
    case "AgentConfigured":
      return "Agent key granted";
    case "AgentRevoked":
      return "Agent key revoked";
    case "FreezeChanged":
      return row.frozen ? "Kill switch on" : "Kill switch off";
    case "Withdrawn":
      return "Owner withdrawal";
    default:
      return row.event;
  }
}

export function LedgerPanel({
  rows,
  status,
  summary,
}: {
  rows: readonly LedgerRow[];
  status: LedgerStatus;
  summary?: LedgerResponse["summary"];
}) {
  return (
    <div className="ledger-preview">
      <div className="landing-ledger-panel" aria-busy={status === "loading"}>
        <div className="landing-ledger-top">
          <h3>Aevum ledger</h3>
          <span>
            {summary && summary.paid + summary.refused > 0
              ? `${summary.paid} paid · ${summary.refused} refused · ${summary.clearedAmount} tUSD8 cleared`
              : "On-chain decisions"}
          </span>
        </div>
        <div
          className="landing-ledger-table"
          role="region"
          aria-label="Latest Aevum payment decisions"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Payee</th>
                <th scope="col">Amount</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.txHash}:${row.logIndex}`}>
                  <td>
                    <span
                      className="ledger-event"
                      data-rejected={row.event === "Rejected"}
                      data-paid={row.event === "Paid"}
                    >
                      {ledgerLabel(row)}
                    </span>
                  </td>
                  <td>
                    {row.payee ? (
                      <code title={row.payee}>
                        {row.payee.slice(0, 6)}…{row.payee.slice(-4)}
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{row.amount ? `${row.amount} tUSD8` : "—"}</td>
                  <td>
                    <a
                      href={`https://explorer-test.qday.info/tx/${row.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.event === "Paid"
                        ? "Paid"
                        : row.event === "Rejected"
                          ? (row.reason ?? "Refused")
                          : "View tx"}{" "}
                      &#8599;
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="landing-ledger-empty" role="status">
            {status === "loading" ? (
              <p>Reading the Aevum ledger…</p>
            ) : (
              <>
                <p>
                  {status === "unavailable"
                    ? "The Aevum ledger didn’t answer just now."
                    : "No vault events yet."}
                </p>
                <a
                  href="https://explorer-test.qday.info/address/0x8fba7dd67e294b3ba5ca164748b9f41c03bad13c"
                  target="_blank"
                  rel="noreferrer"
                >
                  View the vault on the Aevum explorer &#8599;
                </a>
              </>
            )}
          </div>
        )}
        <a className="landing-ledger-link" href="/app#ledger">
          Open the full ledger <Arrow />
        </a>
      </div>
      <div className="ledger-clerk">
        <Clerk pose="tablet" />
      </div>
    </div>
  );
}

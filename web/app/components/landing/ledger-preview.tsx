"use client";

import { useEffect, useState } from "react";
import type { LedgerResponse, LedgerRow } from "../../../lib/ledger";
import { Arrow } from "../brand";
import { Clerk } from "./clerk";

type LedgerStatus = "loading" | "ready" | "unavailable";

export function LedgerPreview() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [status, setStatus] = useState<LedgerStatus>("loading");
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
        setRows(
          data.rows
            .filter((row) => row.event === "Paid" || row.event === "Rejected")
            .slice(0, 3),
        );
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
  return <LedgerPanel rows={rows} status={status} />;
}

export function LedgerPanel({
  rows,
  status,
}: {
  rows: readonly LedgerRow[];
  status: LedgerStatus;
}) {
  return (
    <div className="ledger-preview">
      <div className="landing-ledger-panel" aria-busy={status === "loading"}>
        <div className="landing-ledger-top">
          <h3>Aevum ledger</h3>
          <span>On-chain decisions</span>
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
                    >
                      {row.event}
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
                    {row.event === "Paid" ? "Paid" : (row.reason ?? "Rejected")}
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
                  No payments recorded yet. The testnet proof run fills this
                  ledger.
                </p>
                {status === "unavailable" && (
                  <small>
                    Live ledger unavailable. No payment history could be loaded.
                  </small>
                )}
              </>
            )}
          </div>
        )}
        <a className="landing-ledger-link" href="/app#ledger">
          Open the full ledger <Arrow />
        </a>
      </div>
      <div className="ledger-clerk">
        <Clerk pose={rows.length ? "tablet" : "standby"} />
      </div>
    </div>
  );
}

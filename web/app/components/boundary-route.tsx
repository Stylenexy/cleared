"use client";
import { useState, type CSSProperties } from "react";
import { DeskIcon } from "./brand";
import { PaperGrain } from "./invoice-theatre";
const gates = [
  {
    title: "Within the spending limit",
    detail:
      "0.25 tUSD8 fits a 0.50 per-invoice cap. The vault also checks the daily budget and remaining grant.",
    status: "Amount fits",
  },
  {
    title: "Registered to the right name",
    detail:
      "The full address must belong to Northwind Design Studio. An invoice cannot replace the registry entry.",
    status: "Identity matches",
  },
  {
    title: "A day to catch a change",
    detail:
      "This newly registered destination waits 24 hours. Owner approval can clear this hold, while identity and spending checks still apply.",
    status: "24-hour hold",
  },
  {
    title: "You can stop the queue",
    detail:
      "The kill switch freezes every agent payment, including owner-approved batches. Revoke a grant or let it expire to end access.",
    status: "Frozen by owner",
  },
];
export function BoundaryRoute() {
  const [step, setStep] = useState(0);
  return (
    <section className="boundaries" aria-labelledby="boundary-title">
      <div className="section-heading">
        <h2 id="boundary-title">Give it room.</h2>
        <p>
          One invoice, four boundaries. Follow a newly registered recipient
          through the vault's checks.
        </p>
      </div>
      <div
        className="boundary-route"
        style={{ "--boundary-step": step } as CSSProperties}
      >
        <article className="boundary-invoice">
          <PaperGrain />
          <span>Sample invoice · NDS-001</span>
          <h3>Northwind Design Studio</h3>
          <p>0.25 tUSD8</p>
          <strong>{gates[step].status}</strong>
        </article>
        <div
          className="boundary-gates"
          role="group"
          aria-label="Explore payment boundaries"
        >
          {gates.map((g, n) => (
            <button
              key={g.title}
              aria-pressed={n === step}
              onClick={() => setStep(n)}
            >
              <DeskIcon
                kind={n === 2 ? "clock" : n === 3 ? "pause" : "registry"}
              />
              <span>
                <strong>{g.title}</strong>
                <span>{g.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <a className="text-link" href="/try">
        Try these boundaries with three sample invoices
      </a>
    </section>
  );
}

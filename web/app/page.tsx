import { Arrow, DeskIcon } from "./components/brand";
import { ClearingScene } from "./components/clearing-scene";
import { DecisionStamp } from "./components/clearing-flow";
import { BoundaryRoute } from "./components/boundary-route";
import { PaperGrain } from "./components/invoice-theatre";
import { publicRegistry } from "../lib/public-config";
export default function Home() {
  return (
    <main className="landing">
      <section className="hero">
        <div className="hero-copy">
          <h1>
            Let your agent pay.
            <br />
            <span className="chrome">Keep the last word.</span>
          </h1>
          <div>
            <p>
              For DAOs and web3 teams paying contractors in stablecoins. Your AI
              agent reads and pays the invoice; the contract refuses any address
              that isn't the verified one.
            </p>
            <div className="actions">
              <a className="button" href="/attack">
                Open the attack lab <Arrow />
              </a>
              <a className="text-link" href="/try">
                Try three invoices <Arrow />
              </a>
            </div>
            <p className="hero-note">
              <DeskIcon /> No wallet. No installation. No money at risk.
            </p>
          </div>
        </div>
        <ClearingScene registryAddress={publicRegistry()} />
      </section>
      <BoundaryRoute />
      <section className="receipt-trail" aria-labelledby="trail-title">
        <div>
          <h2 id="trail-title">A reason for every decision.</h2>
          <p>
            The contract checks payment fields. It does not read prompts. Open
            the sample desk to follow each result into a reconciliation table.
          </p>
          <a className="text-link" href="/try">
            Read the sample ledger <Arrow />
          </a>
        </div>
        <div
          className="hero-ledger"
          aria-label="Illustrated three-invoice batch"
        >
          <PaperGrain />
          {[
            {
              name: "Northwind Design Studio",
              amount: "0.25",
              rejected: false,
            },
            { name: "Ledgerline Audits", amount: "0.40", rejected: false },
            {
              name: "Northwind Design Studio lookalike",
              amount: "0.15",
              rejected: true,
            },
          ].map((i) => (
            <div
              key={i.name}
              className={i.rejected ? "ledger-rejected" : undefined}
            >
              <span>
                {i.name}
                <small>
                  {i.rejected
                    ? "Full address does not match"
                    : "Verified destination"}
                </small>
              </span>
              <span>{i.amount} tUSD8</span>
              <DecisionStamp rejected={i.rejected} />
            </div>
          ))}
          <p>
            Sample policy preview · 2 allowed / 1 refused · no transaction sent
          </p>
        </div>
      </section>
    </main>
  );
}

import { Arrow, BrandMark } from "./components/brand";
import { ClearingScene } from "./components/clearing-scene";
export default function Home() {
  return (
    <main className="landing">
      <section className="hero">
        <h1>
          Let your agent pay.
          <br />
          <span className="chrome">Keep the last word.</span>
        </h1>
        <p>
          Your agent reads the invoice. The contract clears the payee.
          <br className="desktop-break" /> Stablecoin payments for teams that
          want autonomy with boundaries.
        </p>
        <div className="actions">
          <a className="button" href="/try">
            Try three invoices <Arrow />
          </a>
          <a className="text-link" href="/attack">
            Try to fool it <Arrow />
          </a>
        </div>
        <div className="hero-note">
          <span aria-hidden="true">⌑</span> No wallet. No installation. No money
          at risk.
        </div>
        <div
          className="hero-ledger"
          aria-label="Illustrated three-invoice batch"
        >
          <div>
            <span className="ledger-icon" aria-hidden="true">
              ✓
            </span>
            <span>
              Kopi Pagi<small>Verified destination</small>
            </span>
            <span>0.25 tUSD8</span>
            <strong>Cleared</strong>
          </div>
          <div>
            <span className="ledger-icon" aria-hidden="true">
              ✓
            </span>
            <span>
              Kertas Kita<small>Verified destination</small>
            </span>
            <span>0.40 tUSD8</span>
            <strong>Cleared</strong>
          </div>
          <div className="ledger-rejected">
            <span className="ledger-icon" aria-hidden="true">
              ×
            </span>
            <span>
              Kopi Pagi lookalike
              <small>One character. A different recipient.</small>
            </span>
            <span>0.15 tUSD8</span>
            <strong>Refused</strong>
          </div>
          <p>
            Sample policy preview · 2 allowed / 1 refused · no transaction sent
          </p>
        </div>
      </section>
      <ClearingScene />
      <section className="boundaries">
        <div className="section-heading">
          <h2>
            Give it room.
            <br />
            <span className="chrome">Set the boundaries.</span>
          </h2>
          <p>
            <strong>
              Spend caps limit how much. Identity decides to whom.
            </strong>{" "}
            The Aevum vault checks both, every time the agent tries to pay.
          </p>
        </div>
        <div className="policy-ledger">
          <article>
            <span aria-hidden="true">⌑</span>
            <div>
              <h3>A name, tied to an address.</h3>
              <p>
                The payee registry binds the contractor's name to a verified
                destination. A convincing invoice cannot overwrite it.
              </p>
            </div>
            <span>Identity</span>
          </article>
          <article>
            <span aria-hidden="true">◷</span>
            <div>
              <h3>New destination? Take a breath.</h3>
              <p>
                New and changed recipients enter a 24-hour hold. Owner approval
                can clear a hold; it cannot bypass identity or spending limits.
              </p>
            </div>
            <span>Trust delay</span>
          </article>
          <article>
            <span aria-hidden="true">Ⅱ</span>
            <div>
              <h3>Your off switch stays yours.</h3>
              <p>
                One kill switch freezes all agent payments, including
                owner-approved batches. Revoke a key or let its grant expire.
              </p>
            </div>
            <span>Control</span>
          </article>
        </div>
      </section>
      <section className="closing">
        <BrandMark />
        <h2>
          Your agent can be fooled.
          <br />
          <span className="chrome">Your money stays put.</span>
        </h2>
        <p>
          Try the poisoned invoice. Watch the destination fail the check.
          <br />
          Then follow every decision back to its reason.
        </p>
        <a className="button" href="/attack">
          Open the attack lab <Arrow />
        </a>
        <p className="closing-note">
          The contract checks payment fields. It does not read prompts.
          <br />
          Demo results are simulations, not on-chain receipts.
        </p>
      </section>
    </main>
  );
}

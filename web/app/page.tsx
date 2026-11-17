import Link from "next/link";
export default function Home() {
  return (
    <main className="landing">
      <section className="hero">
        <p className="eyebrow">Stablecoin invoices for web3 teams and DAOs</p>
        <h1>
          Your agent reads the invoice.
          <br />
          <em>The contract clears the payee.</em>
        </h1>
        <p>
          Pay verified contractors automatically within a daily budget. Hold new
          recipients and changed addresses for owner approval. Freeze every
          agent payment with one switch.
        </p>
        <div className="actions">
          <Link className="button" href="/try">
            Try three invoices
          </Link>
          <Link href="/attack">Try to redirect a payment</Link>
        </div>
        <p className="muted">No wallet or installation needed for the demo.</p>
      </section>
      <section className="story">
        <h2>
          Spend caps limit how much.
          <br />
          Who checks to whom?
        </h2>
        <div className="receipt">
          <div className="receipt-title">
            <strong>Kopi Pagi | contractor</strong>
            <span className="badge danger">Rejected: name mismatch</span>
          </div>
          <p>Invoice lookalike</p>
          <code>0x1111111111111111111111111111111111111112</code>
          <p>Verified identity</p>
          <code>0x1111111111111111111111111111111111111111</code>
          <p>
            A poisoned invoice can fool a model. The registry still decides
            which address can receive funds.
          </p>
        </div>
        <p>
          The contract checks identity, trust delay, daily budget, key expiry
          and revocation on every payment. Every accepted or rejected invoice
          leaves an event.
        </p>
      </section>
      <section className="closing">
        <h2>
          Give your agent a budget.
          <br />
          Keep control of the destination.
        </h2>
        <p>
          Built for teams paying contractor invoices in stablecoins. Small
          businesses can use the same controls for vendor payments.
        </p>
        <Link className="button" href="/try">
          Open the demo
        </Link>
      </section>
    </main>
  );
}

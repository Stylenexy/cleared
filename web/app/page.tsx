import { Arrow } from "./components/brand";
import { Clerk } from "./components/landing/clerk";
import { LedgerPreview } from "./components/landing/ledger-preview";
import { ScrollStory } from "./components/landing/scroll-story";
import { Statement } from "./components/landing/statement";

const products = [
  {
    title: "Payee registry",
    image: "registry",
    width: 319,
    description: "Each contractor name maps to exactly one verified address.",
    href: "/try",
  },
  {
    title: "24-hour hold",
    image: "hold",
    width: 327,
    description:
      "New or changed addresses wait a day before the agent can pay them.",
    href: "/try",
  },
  {
    title: "Kill switch",
    image: "killswitch",
    width: 342,
    description: "Freeze every agent payment at once. Revoke a key any time.",
    href: "/app/keys",
  },
];

export default function Home() {
  return (
    <main className="landing clerk-landing">
      <section className="clerk-hero" aria-labelledby="hero-title">
        <div className="hero-monolith" aria-hidden="true">
          CLEARED
        </div>
        <div className="clerk-hero-grid">
          <div className="clerk-hero-copy">
            <h1 id="hero-title">
              Your AI can read the invoice. It can&apos;t redirect the money.
            </h1>
            <p>For DAOs and web3 teams paying contractors in stablecoins.</p>
            <div className="landing-actions">
              <a className="button landing-primary" href="/attack">
                Open the attack lab <Arrow />
              </a>
              <a className="button landing-secondary" href="/try">
                Try three invoices <Arrow />
              </a>
            </div>
          </div>
          <div className="hero-clerk">
            <Clerk pose="read" eager />
          </div>
          <div className="sample-decisions" aria-label="Sample decisions">
            <p>Sample decisions</p>
            <div className="sample-decision">
              <span className="decision-dot paid" aria-hidden="true" />
              Paid
            </div>
            <div className="sample-decision">
              <span className="decision-dot refused" aria-hidden="true" />
              <span>
                Refused:<small>Name mismatch</small>
              </span>
            </div>
          </div>
        </div>
        <div className="testnet-strip">
          <span>Built on Aevum testnet</span>
          <span aria-hidden="true">·</span>
          <span>Contract-enforced payee registry</span>
          <span aria-hidden="true">·</span>
          <a href="/app#ledger">
            Live on-chain ledger <Arrow />
          </a>
        </div>
      </section>
      <Statement />
      <ScrollStory />
      <section
        className="landing-ledger"
        aria-labelledby="landing-ledger-title"
      >
        <h2 id="landing-ledger-title">
          Every decision
          <br />
          lands on Aevum.
        </h2>
        <LedgerPreview />
        <div className="landing-products">
          {products.map((product) => (
            <a
              className="landing-product"
              href={product.href}
              key={product.title}
            >
              <img
                src={`/icons/${product.image}.webp`}
                width={product.width}
                height={360}
                alt=""
                loading="lazy"
              />
              <div>
                <h3>{product.title}</h3>
                <Arrow />
              </div>
              <p>{product.description}</p>
            </a>
          ))}
        </div>
      </section>
      <section className="landing-cta" aria-labelledby="landing-cta-title">
        <Clerk pose="wave" />
        <div>
          <h2 id="landing-cta-title">Try to fool it.</h2>
          <a className="button landing-primary" href="/attack">
            Open the attack lab <Arrow />
          </a>
        </div>
      </section>
    </main>
  );
}

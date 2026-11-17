import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: "Cleared | Stablecoin invoices with contract-enforced payees",
  description:
    "Invoice payments for web3 teams and DAOs. Trusted contractors get paid automatically; new recipients need owner approval.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <Link className="wordmark" href="/">
            Cleared<span aria-hidden="true">.</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/try">Try it</Link>
            <Link href="/attack">Attack</Link>
            <Link href="/app">Treasury</Link>
            <Link href="/app/keys">Controls</Link>
          </nav>
        </header>
        {children}
        <footer>
          <span>Cleared | Aevum Builder Challenge prototype</span>
          <span>Test tokens only. Contract rules decide who gets paid.</span>
        </footer>
      </body>
    </html>
  );
}

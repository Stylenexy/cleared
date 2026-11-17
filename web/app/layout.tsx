import type { Metadata } from "next";
import { Navigation } from "./components/navigation";
import { BrandMark } from "./components/brand";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000",
  ),
  title: "Cleared | Stablecoin invoices with contract-enforced payees",
  description:
    "Invoice payments for web3 teams and DAOs. Trusted contractors get paid automatically; new recipients need owner approval.",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  openGraph: {
    title: "Cleared. Your agent can be fooled. Your money stays put.",
    description:
      "A payee registry and guarded vault on Aevum. Let the agent prepare. Let the contract decide.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Cleared — The contract has the last word. Lookalike destination refused.",
      },
    ],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Navigation />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <footer>
          <a className="wordmark" href="/">
            <BrandMark />
            Cleared
          </a>
          <span>
            Aevum Builder Challenge prototype.
            <br />
            Test tokens. Real boundaries.
          </span>
          <a href="/try">Open the clearing desk ↗</a>
        </footer>
      </body>
    </html>
  );
}

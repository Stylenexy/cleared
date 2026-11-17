import type { Metadata } from "next";
import { Navigation } from "./components/navigation";
import { Arrow, BrandMark } from "./components/brand";
import "./globals.css";
// Nonce-bearing Next scripts must be rendered per request, never prerendered.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000",
  ),
  title: "Cleared | Stablecoin invoices with contract-enforced payees",
  description:
    "For DAOs and web3 teams paying contractors in stablecoins. Your AI agent reads and pays the invoice; the contract refuses any address that isn't the verified one.",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  openGraph: {
    title: "Let your agent pay. Keep the last word.",
    description:
      "For DAOs and web3 teams paying contractors in stablecoins. Your AI agent reads and pays the invoice; the contract refuses any address that isn't the verified one.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Cleared. Let your agent pay. Keep the last word.",
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
          <a href="/try">
            Open the clearing desk <Arrow />
          </a>
        </footer>
      </body>
    </html>
  );
}

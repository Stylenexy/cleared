import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: "Pagar | Pembayaran invoice dengan batas yang jelas",
  description:
    "Baca invoice, periksa nama penerima, dan setujui pembayaran tUSD8 dengan kendali pemilik.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <header>
          <Link className="wordmark" href="/">
            Pagar<span aria-hidden="true">.</span>
          </Link>
          <nav aria-label="Navigasi utama">
            <Link href="/app">Invoice</Link>
            <Link href="/app/keys">Kunci agen</Link>
          </nav>
        </header>
        {children}
        <footer>
          <span>Pagar · Prototipe Aevum Builder Challenge</span>
          <span>Token uji saja. Tinjau setiap penerima.</span>
        </footer>
      </body>
    </html>
  );
}

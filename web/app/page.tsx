import Link from "next/link";
export default function Home() {
  return (
    <main className="landing">
      <section className="hero">
        <h1>
          Invoice boleh salah.
          <br />
          <em>Uangmu tetap berpagar.</em>
        </h1>
        <p>
          Asisten keuangan untuk UMKM yang membaca invoice dan menyiapkan
          pembayaran tUSD8. Nama dan alamat penerima diperiksa ke registri. Kamu
          memegang persetujuan terakhir.
        </p>
        <Link className="button" href="/app">
          Tinjau tiga invoice contoh
        </Link>
        <p className="muted">
          Your AI can read the invoice. It can&apos;t redirect the money.
        </p>
      </section>
      <section className="story">
        <h2>
          Satu karakter alamat.
          <br />
          Satu pembayaran yang dicegah.
        </h2>
        <div className="receipt">
          <div className="receipt-title">
            <strong>Kopi Pagi</strong>
            <span className="badge danger">Nama tidak cocok</span>
          </div>
          <p>Alamat invoice beracun</p>
          <code>0x1111111111111111111111111111111111111112</code>
          <p>Alamat di registri sampel</p>
          <code>0x1111111111111111111111111111111111111111</code>
          <p>
            Kontrak memeriksa pasangan nama dan alamat. Teks instruksi
            tersembunyi pada invoice tidak memberi kewenangan pembayaran.
          </p>
        </div>
        <p>
          Agen hanya menyiapkan batch. Batas belanja, masa berlaku, dan
          pencabutan kuncinya diperiksa lagi saat pemilik mengeksekusi. Invoice
          yang lolos dibayar; penolakan tetap tercatat.
        </p>
      </section>
      <section className="closing">
        <h2>Dari tagihan ke catatan kas.</h2>
        <p>
          Unggah TXT, CSV, atau PDF teks. Tinjau setiap penerima, setujui dengan
          dompet pemilik, lalu cocokkan catatan invoice dengan event kontrak dan
          ekspor CSV.
        </p>
        <Link className="button" href="/app">
          Buka meja bendahara
        </Link>
        <p className="muted">
          Demo lokal berjalan tanpa kunci layanan ekstraksi. Bukti Aevum testnet
          menyusul setelah deploy terpisah.
        </p>
      </section>
    </main>
  );
}

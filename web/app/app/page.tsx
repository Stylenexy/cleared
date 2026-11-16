"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  createWalletClient,
  decodeEventLog,
  http,
  type Hash,
  type WalletClient,
} from "viem";
import {
  approve,
  stage,
  reconcile,
  toCsv,
  displayAmount,
  reviewInvoice,
  vaultAbi,
  registryAbi,
  tokenAbi,
  local,
  type Invoice,
  type AgentPolicy,
  type Reconciliation,
} from "@pagar/sdk";
import {
  deserializeInvoice,
  type SerializedInvoice,
} from "../../lib/invoice-wire";
import {
  reader,
  requireContracts,
  connectWallet,
  type Config,
} from "../../lib/client";

const samplePaths = ["01-kopi.txt", "02-kertas.txt", "03-beracun.txt"];
const fallbackPolicy: AgentPolicy = {
  totalLimit: 1_000_000n,
  perItemLimit: 500_000n,
  spent: 0n,
  expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86400),
  version: 1n,
  revoked: false,
};
export default function Desk() {
  const [config, setConfig] = useState<Config>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [policy, setPolicy] = useState<AgentPolicy>();
  const [batch, setBatch] = useState<bigint>();
  const [stageHash, setStageHash] = useState<Hash>();
  const [tx, setTx] = useState<Hash>();
  const [wallet, setWallet] = useState<WalletClient>();
  const [rows, setRows] = useState<Reconciliation[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [llm, setLlm] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setError("Konfigurasi gagal dimuat. Muat ulang halaman."));
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  async function run(title: string, fn: () => Promise<void>) {
    setBusy(title);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Proses gagal. Coba lagi.");
    } finally {
      setBusy("");
    }
  }
  async function check(items: Invoice[]) {
    if (!config) throw new Error("Konfigurasi belum dimuat.");
    let p = fallbackPolicy;
    let verified: boolean[];
    if (config.vault) {
      requireContracts(config);
      const c = reader(config);
      if ((await c.getChainId()) !== config.chainId)
        throw new Error("Chain RPC tidak cocok.");
      const [totalLimit, perItemLimit, spent, expiresAt, version, revoked] =
        await c.readContract({
          address: config.vault,
          abi: vaultAbi,
          functionName: "agents",
          args: [config.agent],
        });
      p = {
        totalLimit,
        perItemLimit,
        spent,
        expiresAt: BigInt(expiresAt),
        version: BigInt(version),
        revoked,
      };
      verified = await Promise.all(
        items.map((i) =>
          c.readContract({
            address: config.registry!,
            abi: registryAbi,
            functionName: "isVerified",
            args: [i.name, i.payee],
          }),
        ),
      );
      setSource(
        "Diperiksa dari registri dan batas kunci on-chain. Pemeriksaan akan diulang saat eksekusi.",
      );
    } else {
      verified = items.map(
        (i) =>
          (i.name === "Kopi Pagi" &&
            i.payee.toLowerCase() ===
              "0x1111111111111111111111111111111111111111") ||
          (i.name === "Kertas Kita" &&
            i.payee.toLowerCase() ===
              "0x2222222222222222222222222222222222222222"),
      );
      setSource(
        "Pratinjau registri sampel. Belum diperiksa on-chain; jalankan demo Anvil untuk pembayaran.",
      );
    }
    let planned = 0n;
    const now = config.vault
      ? BigInt((await reader(config).getBlock()).timestamp)
      : BigInt(Math.floor(Date.now() / 1000));
    const checked: string[] = [];
    const seen = new Set<string>();
    const balance =
      config.vault && config.token
        ? await reader(config).readContract({
            address: config.token,
            abi: tokenAbi,
            functionName: "balanceOf",
            args: [config.vault],
          })
        : undefined;
    for (let n = 0; n < items.length; n++) {
      const i = items[n];
      let label = reviewInvoice(i, verified[n], p, now, planned);
      if (seen.has(i.ref)) label = "Referensi ganda di batch";
      seen.add(i.ref);
      if (
        config.vault &&
        (await reader(config).readContract({
          address: config.vault,
          abi: vaultAbi,
          functionName: "paidRefs",
          args: [i.ref],
        }))
      )
        label = "Referensi sudah dibayar";
      if (
        label === "Terverifikasi" &&
        balance !== undefined &&
        planned + i.amount > balance
      )
        label = "Saldo vault tidak cukup";
      if (label === "Terverifikasi") planned += i.amount;
      checked.push(label);
    }
    setPolicy(p);
    setLabels(checked);
  }
  async function upload(files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("llm", String(llm));
    const r = await fetch("/api/parse", { method: "POST", body: form });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    const parsed = (data.invoices as SerializedInvoice[]).map(
      deserializeInvoice,
    );
    setInvoices(parsed);
    setLabels([]);
    setBatch(undefined);
    setStageHash(undefined);
    setTx(undefined);
    setRows([]);
    await check(parsed);
  }
  const choose = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) void run("Membaca invoice", () => upload(files));
    e.target.value = "";
  };
  async function samples() {
    await run("Membaca sampel", async () => {
      const files = await Promise.all(
        samplePaths.map(
          async (p) =>
            new File([await fetch("/samples/" + p).then((r) => r.text())], p, {
              type: "text/plain",
            }),
        ),
      );
      await upload(files);
    });
  }
  async function stageBatch() {
    await run("Menyiapkan batch", async () => {
      if (!config) throw new Error("Konfigurasi belum dimuat.");
      requireContracts(config);
      await check(invoices);
      const c = reader(config);
      let signer = wallet;
      if (config.network === "local") {
        if ((await c.getChainId()) !== 31337)
          throw new Error("Chain lokal salah.");
        signer = createWalletClient({
          account: config.agent,
          chain: local,
          transport: http("http://127.0.0.1:8545"),
        });
      } else signer = await connectWallet(config);
      if (!signer) throw new Error("Hubungkan dompet agen.");
      const hash = await stage(signer, config.vault, invoices);
      setStageHash(hash);
      const receipt = await c.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Stage gagal.");
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== config.vault.toLowerCase()) continue;
        try {
          const event = decodeEventLog({
            abi: vaultAbi,
            data: log.data,
            topics: log.topics,
          });
          if (event.eventName === "Staged") {
            setBatch(event.args.batchId);
            return;
          }
        } catch {}
      }
      throw new Error("Event Staged tidak ditemukan.");
    });
  }
  async function execute() {
    await run("Menunggu persetujuan dan eksekusi", async () => {
      if (!config || batch === undefined)
        throw new Error("Siapkan batch dahulu.");
      requireContracts(config);
      const signer = wallet;
      if (!signer) throw new Error("Hubungkan pemilik dahulu.");
      const c = reader(config);
      const owner = await c.readContract({
        address: config.vault,
        abi: vaultAbi,
        functionName: "owner",
      });
      if (signer.account?.address.toLowerCase() !== owner.toLowerCase())
        throw new Error("Dompet aktif bukan pemilik vault.");
      const [, , executed, stored] = await c.readContract({
        address: config.vault,
        abi: vaultAbi,
        functionName: "getBatch",
        args: [batch],
      });
      if (
        executed ||
        stored.length !== invoices.length ||
        stored.some(
          (i, n) =>
            i.ref !== invoices[n].ref ||
            i.invoiceHash !== invoices[n].invoiceHash ||
            i.amount !== invoices[n].amount ||
            i.name !== invoices[n].name ||
            i.payee.toLowerCase() !== invoices[n].payee.toLowerCase(),
        )
      )
        throw new Error("Isi batch tidak cocok dengan tinjauan. Unggah ulang.");
      const hash = await approve(signer, config.vault, batch);
      setTx(hash);
      const receipt = await c.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        setTx(undefined);
        throw new Error(
          "Eksekusi gagal. Tidak ada hasil pembayaran yang dikonfirmasi.",
        );
      }
      setRows(
        await reconcile(
          c,
          config.vault,
          invoices,
          BigInt(config.deployBlock),
          receipt.blockNumber,
          batch,
        ),
      );
      await check(invoices);
    });
  }
  async function refreshResults() {
    await run("Mencocokkan event kontrak", async () => {
      if (!config || batch === undefined) return;
      requireContracts(config);
      setRows(
        await reconcile(
          reader(config),
          config.vault,
          invoices,
          BigInt(config.deployBlock),
          undefined,
          batch,
        ),
      );
    });
  }
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "pagar-rekonsiliasi.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  const connect = (isLocal: boolean) =>
    run("Menghubungkan pemilik", async () => {
      if (!config) throw new Error("Konfigurasi belum dimuat.");
      setWallet(await connectWallet(config, isLocal));
    });
  return (
    <main className="desk">
      <div className="page-heading">
        <div>
          <h1>Meja bendahara.</h1>
          <p>Baca tagihan. Periksa penerima. Kamu yang menyetujui.</p>
        </div>
        <Link href="/app/keys">Atur kunci agen</Link>
      </div>
      {offline && (
        <p role="alert" className="notice danger">
          Kamu sedang luring. Sambungkan kembali sebelum membaca jaringan atau
          mengirim transaksi.
        </p>
      )}
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="notice">
          {busy}…
        </p>
      )}
      <section>
        <h2>1. Unggah invoice</h2>
        <p>
          TXT berlabel, CSV, atau PDF dengan teks yang bisa diseleksi. Maksimal
          10 berkas, 2 MB per berkas. PDF pindai belum didukung.
        </p>
        <div className="actions">
          <label className="button">
            Pilih berkas
            <input
              aria-label="Pilih invoice"
              type="file"
              multiple
              accept=".txt,.csv,.pdf"
              disabled={!!busy || !config}
              onChange={choose}
            />
          </label>
          <button disabled={!!busy || !config} onClick={samples}>
            Pakai 3 invoice sampel
          </button>
          <a href="/samples/invoices.csv" download>
            Unduh CSV sampel
          </a>
        </div>
        {config?.llmAvailable && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={llm}
              onChange={(e) => setLlm(e.target.checked)}
            />{" "}
            Gunakan ekstraksi layanan bahasa (isi invoice dikirim ke penyedia
            yang dikonfigurasi)
          </label>
        )}
        <p className="muted">
          Sampel fiktif: dua sah, satu beracun. Tanpa layanan bahasa, parser
          deterministik tetap berjalan.
        </p>
      </section>
      <section>
        <h2>2. Tinjau batch</h2>
        <p>
          {source || "Belum ada invoice. Pilih berkas atau gunakan sampel."}
        </p>
        {invoices.length > 0 && (
          <>
            <ol className="invoice-list">
              {invoices.map((i, n) => (
                <li key={n} className="invoice">
                  <div className="receipt-title">
                    <div>
                      <strong>{i.name}</strong>
                      <p>{i.reference}</p>
                    </div>
                    <span
                      className={
                        "badge " +
                        (labels[n] === "Terverifikasi" ? "safe" : "danger")
                      }
                    >
                      {labels[n] ?? "Belum diperiksa"}
                    </span>
                  </div>
                  <code>{i.payee}</code>
                  <p className="amount">
                    {displayAmount(i.amount)} <small>tUSD8</small>
                  </p>
                  <details>
                    <summary>Hash dokumen</summary>
                    <code>{i.invoiceHash}</code>
                  </details>
                </li>
              ))}
            </ol>
            {policy && (
              <p>
                Sisa batas agen:{" "}
                {displayAmount(policy.totalLimit - policy.spent)} tUSD8 · Batas
                per item: {displayAmount(policy.perItemLimit)} tUSD8
              </p>
            )}
            <p>
              Semua item dikirim dalam batch, termasuk item merah, agar kontrak
              mencatat alasan penolakannya. Hanya item yang lolos pemeriksaan
              saat eksekusi yang dibayar.
            </p>
            <div className="actions">
              <button
                onClick={() => run("Memeriksa ulang", () => check(invoices))}
                disabled={!!busy}
              >
                Periksa ulang
              </button>
              <button
                className="primary"
                onClick={stageBatch}
                disabled={!!busy || batch !== undefined}
              >
                Siapkan sebagai agen
              </button>
            </div>
          </>
        )}
        {stageHash && (
          <p>
            Transaksi stage:{" "}
            <Tx hash={stageHash} remote={config?.network === "aevum"} />
          </p>
        )}
        {batch !== undefined && (
          <p className="notice">
            Batch #{batch.toString()} tersimpan on-chain. Kunci agen tidak
            memindahkan uang.
          </p>
        )}
      </section>
      <section>
        <h2>3. Setujui dengan dompet pemilik</h2>
        <p>
          Jaringan:{" "}
          {config?.network === "local"
            ? "Anvil lokal, chain 31337"
            : config
              ? "Aevum testnet, chain 44005"
              : "Memuat konfigurasi"}
          .{" "}
          {wallet?.account
            ? `Dompet aktif: ${wallet.account.address}`
            : "Belum ada dompet aktif."}
        </p>
        <div className="actions">
          <button onClick={() => connect(false)} disabled={!!busy || !config}>
            Hubungkan dompet
          </button>
          {config?.network === "local" && (
            <button
              disabled={!!busy || !config.owner}
              onClick={() => connect(true)}
            >
              Gunakan pemilik Anvil
            </button>
          )}
          <button
            className="primary"
            onClick={execute}
            disabled={!!busy || batch === undefined || !!tx || !wallet}
          >
            Setujui dan eksekusi batch
          </button>
        </div>
      </section>
      <section>
        <h2>4. Hasil dan rekonsiliasi</h2>
        {tx && (
          <p>
            Transaksi eksekusi:{" "}
            <Tx hash={tx} remote={config?.network === "aevum"} />
          </p>
        )}
        {rows.length === 0 ? (
          <p>
            Belum ada hasil. Pembayaran hanya dikonfirmasi setelah receipt dan
            event kontrak terbaca.
          </p>
        ) : (
          <>
            <p>
              {rows.filter((r) => r.status === "Dibayar").length} invoice
              dibayar. {rows.filter((r) => r.status !== "Dibayar").length}{" "}
              invoice perlu perhatian.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Referensi</th>
                    <th>Penerima</th>
                    <th>tUSD8</th>
                    <th>Hasil kontrak</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, n) => (
                    <tr key={n}>
                      <td>{r.reference}</td>
                      <td>{r.name}</td>
                      <td>{r.amount}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={exportCsv}>Ekspor rekonsiliasi CSV</button>
          </>
        )}
        <button
          disabled={!!busy || batch === undefined}
          onClick={refreshResults}
        >
          Muat ulang hasil
        </button>
      </section>
    </main>
  );
}
function Tx({ hash, remote }: { hash: Hash; remote: boolean }) {
  return remote ? (
    <a
      className="hash"
      href={"https://explorer-test.qday.info/tx/" + hash}
      target="_blank"
      rel="noreferrer"
    >
      {hash}
    </a>
  ) : (
    <code>{hash} (lokal)</code>
  );
}

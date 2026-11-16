"use client";
import { useEffect, useState } from "react";
import {
  encodeFunctionData,
  isAddress,
  type Address,
  type WalletClient,
} from "viem";
import { amount6, displayAmount, vaultAbi, type AgentPolicy } from "@pagar/sdk";
import {
  reader,
  connectWallet,
  requireContracts,
  type Config,
} from "../../../lib/client";
export default function Keys() {
  const [config, setConfig] = useState<Config>();
  const [wallet, setWallet] = useState<WalletClient>();
  const [policy, setPolicy] = useState<AgentPolicy>();
  const [agent, setAgent] = useState("");
  const [total, setTotal] = useState("1");
  const [perItem, setPerItem] = useState("0.5");
  const [hours, setHours] = useState("24");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");
  async function refresh(c: Config, address: string) {
    requireContracts(c);
    if (!isAddress(address)) throw new Error("Alamat agen tidak sah.");
    const [totalLimit, perItemLimit, spent, expiresAt, version, revoked] =
      await reader(c).readContract({
        address: c.vault,
        abi: vaultAbi,
        functionName: "agents",
        args: [address],
      });
    setPolicy({
      totalLimit,
      perItemLimit,
      spent,
      expiresAt: BigInt(expiresAt),
      version: BigInt(version),
      revoked,
    });
  }
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(async (c: Config) => {
        setConfig(c);
        setAgent(c.agent ?? "");
        if (c.vault && c.agent)
          try {
            await refresh(c, c.agent);
          } catch {
            setError(
              "Anvil atau RPC tidak terjangkau. Jalankan demo lokal, lalu periksa ulang.",
            );
          }
      })
      .catch(() => setError("Konfigurasi gagal dimuat."));
  }, []);
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Proses gagal.");
    } finally {
      setBusy("");
    }
  }
  async function connect(useLocal: boolean) {
    await run("Menghubungkan pemilik", async () => {
      if (!config) throw new Error("Konfigurasi belum dimuat.");
      setWallet(await connectWallet(config, useLocal));
    });
  }
  async function mutate(revoke: boolean) {
    await run(revoke ? "Mencabut kunci" : "Menyimpan batas kunci", async () => {
      if (!config || !wallet?.account)
        throw new Error("Hubungkan dompet pemilik dahulu.");
      requireContracts(config);
      if (!isAddress(agent)) throw new Error("Alamat agen tidak sah.");
      const c = reader(config);
      const owner = await c.readContract({
        address: config.vault,
        abi: vaultAbi,
        functionName: "owner",
      });
      if (wallet.account.address.toLowerCase() !== owner.toLowerCase())
        throw new Error("Hanya pemilik vault yang boleh mengatur agen.");
      let data: `0x${string}`;
      if (revoke)
        data = encodeFunctionData({
          abi: vaultAbi,
          functionName: "revokeAgent",
          args: [agent as Address],
        });
      else {
        const t = amount6(total),
          p = amount6(perItem),
          h = Number(hours);
        if (p > t || !Number.isInteger(h) || h < 1 || h > 8760)
          throw new Error(
            "Batas item harus ≤ total; masa berlaku 1 sampai 8.760 jam.",
          );
        const expires = (await c.getBlock()).timestamp + BigInt(h) * 3600n;
        data = encodeFunctionData({
          abi: vaultAbi,
          functionName: "configureAgent",
          args: [agent as Address, t, p, expires],
        });
      }
      const tx = await wallet.sendTransaction({
        account: wallet.account,
        chain: wallet.chain,
        to: config.vault,
        data,
        type: "legacy",
      });
      setHash(tx);
      const receipt = await c.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== "success")
        throw new Error("Pengaturan kunci gagal.");
      await refresh(config, agent);
    });
  }
  return (
    <main className="desk">
      <h1>Kunci agen, batas jelas.</h1>
      <p>
        Agen hanya boleh menyiapkan batch. Setiap pembayaran tetap perlu
        persetujuan pemilik.
      </p>
      {error && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="notice">
          {busy}…
        </p>
      )}
      <div className="actions">
        <button disabled={!!busy || !config} onClick={() => connect(false)}>
          Hubungkan dompet pemilik
        </button>
        {config?.network === "local" && (
          <button
            disabled={!!busy || !config.owner}
            onClick={() => connect(true)}
          >
            Gunakan pemilik Anvil
          </button>
        )}
      </div>
      <p className="hash">
        {wallet?.account?.address ?? "Belum ada dompet aktif."}
      </p>
      <section className="key-panel">
        <h2>Periksa dan atur kewenangan</h2>
        <label>
          Alamat agen
          <input
            value={agent}
            onChange={(e) => {
              setAgent(e.target.value);
              setPolicy(undefined);
            }}
            placeholder="0x…"
            spellCheck={false}
          />
        </label>
        <button
          disabled={!!busy || !config}
          onClick={() =>
            run("Membaca batas", async () => {
              if (config) await refresh(config, agent);
            })
          }
        >
          Periksa kunci
        </button>
        {policy ? (
          <dl>
            <div>
              <dt>Status</dt>
              <dd>
                {policy.version === 0n
                  ? "Belum diberi izin"
                  : policy.revoked
                    ? "Dicabut"
                    : Number(policy.expiresAt) * 1000 <= Date.now()
                      ? "Kedaluwarsa"
                      : "Aktif"}
              </dd>
            </div>
            <div>
              <dt>Batas total / terpakai</dt>
              <dd>
                {displayAmount(policy.totalLimit)} /{" "}
                {displayAmount(policy.spent)} tUSD8
              </dd>
            </div>
            <div>
              <dt>Sisa</dt>
              <dd>{displayAmount(policy.totalLimit - policy.spent)} tUSD8</dd>
            </div>
            <div>
              <dt>Batas per item</dt>
              <dd>{displayAmount(policy.perItemLimit)} tUSD8</dd>
            </div>
            <div>
              <dt>Berlaku sampai</dt>
              <dd>
                {policy.expiresAt > 0n
                  ? new Date(Number(policy.expiresAt) * 1000).toLocaleString(
                      "id-ID",
                    )
                  : "Belum diatur"}
              </dd>
            </div>
          </dl>
        ) : (
          <p>Belum ada data kunci yang dibaca.</p>
        )}
        <div className="form-grid">
          <label>
            Batas total (tUSD8)
            <input
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </label>
          <label>
            Batas per invoice (tUSD8)
            <input
              inputMode="decimal"
              value={perItem}
              onChange={(e) => setPerItem(e.target.value)}
            />
          </label>
          <label>
            Masa berlaku (jam)
            <input
              type="number"
              min="1"
              max="8760"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </label>
        </div>
        <p>
          Memberi izin baru mereset batas terpakai dan membatalkan semua batch
          tertunda dari izin lama. Mencabut kunci membuat batch tertundanya
          ditolak saat eksekusi.
        </p>
        <div className="actions">
          <button
            className="primary"
            disabled={!!busy || !wallet}
            onClick={() => mutate(false)}
          >
            Simpan izin baru
          </button>
          <button
            className="danger"
            disabled={!!busy || !wallet || !policy?.version || policy.revoked}
            onClick={() => mutate(true)}
          >
            Cabut kunci agen
          </button>
        </div>
        {hash && (
          <p>
            Transaksi:{" "}
            {config?.network === "aevum" ? (
              <a
                className="hash"
                href={"https://explorer-test.qday.info/tx/" + hash}
              >
                {hash}
              </a>
            ) : (
              <code>{hash} (lokal)</code>
            )}
          </p>
        )}
      </section>
    </main>
  );
}

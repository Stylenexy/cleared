import { KOPI_PAGI, KOPI_PAGI_LOOKALIKES } from "../web/lib/sample-addresses";
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import {
  parseInvoice,
  parseCsv,
  extractDeterministic,
} from "../web/lib/invoices";
import { reviewInvoice, type AgentPolicy } from "@cleared/sdk";
const sample = (n: string) => readFile("web/public/samples/" + n, "utf8");
const policy: AgentPolicy = {
  totalLimit: 1_000_000n,
  perItemLimit: 500_000n,
  spent: 0n,
  expiresAt: 2000n,
  version: 1n,
  revoked: false,
};
afterEach(() => vi.unstubAllGlobals());
describe("deterministic invoices", () => {
  it("extracts both valid samples with six decimals", async () => {
    const a = await parseInvoice(await sample("01-kopi.txt")),
      b = await parseInvoice(await sample("02-kertas.txt"));
    expect(a.amount).toBe(250_000n);
    expect(b.amount).toBe(400_000n);
    expect(a.ref).not.toBe(b.ref);
  });
  it("extracts the poisoned address, then flags the registry mismatch", async () => {
    const text = await sample("03-beracun.txt");
    expect(text).toContain("font-size:0");
    expect(text).toContain("Ignore previous instructions");
    const i = await parseInvoice(text);
    expect(i.payee).toBe(KOPI_PAGI_LOOKALIKES[0]);
    const verified = i.name === "Northwind Design Studio" && i.payee === KOPI_PAGI;
    expect(reviewInvoice(i, verified, policy, 1000n)).toBe("Name mismatch");
  });
  it("never calls a language provider by default", async () => {
    const fetch = vi.fn(() => {
      throw new Error("external network forbidden in test");
    });
    vi.stubGlobal("fetch", fetch);
    await parseInvoice(await sample("01-kopi.txt"));
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects missing fields", () =>
    expect(() => extractDeterministic("Reference: INV-1")).toThrow());
  it("rejects ambiguous repeated address fields", async () =>
    expect(
      parseInvoice(
        (await sample("01-kopi.txt")) + `\nAddress: ${KOPI_PAGI_LOOKALIKES[0]}`,
      ),
    ).rejects.toThrow());
  it("rejects seven fractional digits", async () =>
    expect(
      parseInvoice((await sample("01-kopi.txt")).replace("0.25", "0.1234567")),
    ).rejects.toThrow());
  it("rejects a malformed address", async () =>
    expect(
      parseInvoice(
        (await sample("01-kopi.txt")).replace(KOPI_PAGI, "not-an-address"),
      ),
    ).rejects.toThrow());
  it("handles CRLF without changing the extracted fields", async () =>
    expect(
      (
        await parseInvoice(
          (await sample("01-kopi.txt")).replaceAll("\n", "\r\n"),
        )
      ).amount,
    ).toBe(250_000n));
  it("rejects another currency", async () =>
    expect(
      parseInvoice(
        (await sample("01-kopi.txt")).replace(
          "Currency: tUSD8",
          "Currency: USD",
        ),
      ),
    ).rejects.toThrow());
  it("hashes source text so a changed invoice has a changed hash", async () => {
    const t = await sample("01-kopi.txt");
    expect((await parseInvoice(t)).invoiceHash).not.toBe(
      (await parseInvoice(t + "\nChanged")).invoiceHash,
    );
  });
  it("parses sample CSV with the same invoice references", async () => {
    const csv = parseCsv(await sample("invoices.csv"));
    expect(csv).toHaveLength(3);
    expect(csv[0].ref).toBe(
      (await parseInvoice(await sample("01-kopi.txt"))).ref,
    );
    expect(csv[2].payee).toBe(KOPI_PAGI_LOOKALIKES[0]);
  });
  it("handles quoted CSV fields and rejects unterminated quotes", () => {
    expect(
      parseCsv(
        `reference,name,payee,amount,currency\n"INV,1","Northwind, Design Studio",${KOPI_PAGI},0.25,tUSD8`,
      )[0].name,
    ).toBe("Northwind, Design Studio");
    expect(() =>
      parseCsv('reference,name,payee,amount,currency\n"unterminated'),
    ).toThrow();
  });
  it("rejects too many CSV rows", () =>
    expect(() =>
      parseCsv(
        "reference,name,payee,amount,currency\n" +
          Array(51).fill(`a,b,${KOPI_PAGI},1,tUSD8`).join("\n"),
      ),
    ).toThrow());
});

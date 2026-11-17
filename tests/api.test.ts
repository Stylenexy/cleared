import { describe, it, expect, vi, afterEach } from "vitest";
import { readFile } from "node:fs/promises";
import { keccak256 } from "viem";
import { POST } from "../web/app/api/parse/route";
import {
  KOPI_PAGI,
  KERTAS_KITA,
  KOPI_PAGI_LOOKALIKES,
} from "../web/lib/sample-addresses";
afterEach(() => vi.unstubAllGlobals());
async function request(files: File[]) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  return POST(
    new Request("http://localhost/api/parse", { method: "POST", body: form }),
  );
}
describe("upload API", () => {
  it("parses TXT sample uploads", async () => {
    const r = await request([
      new File(
        [await readFile("web/public/samples/01-northwind.txt")],
        "invoice.txt",
      ),
    ]);
    expect(r.status).toBe(200);
    expect((await r.json()).invoices[0].amount).toBe("250000");
  });
  it("parses all PDF samples and keeps the poisoned address", async () => {
    const fetch = vi.fn(() => {
      throw new Error("Network disabled");
    });
    vi.stubGlobal("fetch", fetch);
    const files = await Promise.all(
      ["01-northwind", "02-ledgerline", "03-poisoned"].map(
        async (n) =>
          new File([await readFile(`web/public/samples/${n}.pdf`)], n + ".pdf"),
      ),
    );
    const r = await request(files);
    const j = await r.json();
    expect(j.error).toBeUndefined();
    expect(r.status).toBe(200);
    expect(j.invoices).toHaveLength(3);
    expect(
      j.invoices.map((invoice: { reference: string }) => invoice.reference),
    ).toEqual(["NDS-001", "LLA-002", "NDS-003"]);
    expect(
      j.invoices.map((invoice: { payee: string }) => invoice.payee),
    ).toEqual([KOPI_PAGI, KERTAS_KITA, KOPI_PAGI_LOOKALIKES[0]]);
    expect(j.invoices[0].invoiceHash).toBe(
      keccak256(
        new Uint8Array(await readFile("web/public/samples/01-northwind.pdf")),
      ),
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects empty and unsupported uploads", async () => {
    expect((await request([])).status).toBe(400);
    expect((await request([new File(["bad"], "invoice.exe")])).status).toBe(
      400,
    );
  });
  it("rejects files larger than 2 MB", async () =>
    expect(
      (await request([new File(["x".repeat(2_000_001)], "large.txt")])).status,
    ).toBe(400));
  it("rejects corrupt PDF data with a readable error", async () => {
    const r = await request([new File(["not a PDF"], "broken.pdf")]);
    expect(r.status).toBe(400);
    expect(typeof (await r.json()).error).toBe("string");
  });
  it("parses CSV as a batch", async () => {
    const r = await request([
      new File(
        [await readFile("web/public/samples/invoices.csv")],
        "invoices.csv",
      ),
    ]);
    expect((await r.json()).invoices).toHaveLength(3);
  });
});

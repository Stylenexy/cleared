import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractInvoice,
  MAX_INVOICE_LENGTH,
  validateInvoice,
} from "../web/lib/invoices";
import {
  attackText,
  cachedExtractions,
  lookalikes,
  verifiedAddress,
} from "../web/lib/attack-samples";
import { demoDecision, recordAttack } from "../web/lib/demo";
import { POST } from "../web/app/api/attack/route";
import { keccak256, toBytes } from "viem";

beforeEach(() => {
  vi.stubEnv("LLM_PROVIDER", "");
  vi.stubEnv("LLM_API_KEY", "");
  vi.stubEnv("CLEARED_NETWORK", "demo");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Network disabled in tests");
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const hash = keccak256(toBytes("sample"));
const fields = {
  reference: "INV-1",
  name: "Kopi Pagi",
  payee: verifiedAddress,
  amount: "0.25",
  currency: "tUSD8",
};
async function request(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/attack", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}
function provider(content: unknown, stop_reason = "end_turn") {
  vi.stubEnv("LLM_PROVIDER", "anthropic");
  vi.stubEnv("LLM_API_KEY", "test-placeholder");
  const fetch = vi.fn(async () =>
    Response.json({
      content: [
        {
          type: "text",
          text: typeof content === "string" ? content : JSON.stringify(content),
        },
      ],
      stop_reason,
    }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
describe("extraction boundary and attack lab", () => {
  it.each(cachedExtractions)(
    "replays only exact saved inputs: $fields.payee",
    async (sample) => {
      const r = await extractInvoice(sample.text);
      expect(r.source).toBe("cached-sample");
      expect(r.invoice.payee).toBe(sample.fields.payee);
      expect(demoDecision(r.invoice)).toBe("Name mismatch");
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("never pretends an edited template is a saved response", async () => {
    const r = await extractInvoice(
      attackText(lookalikes[0], true).replace("Amount: 0.15", "Amount: 0.21"),
    );
    expect(r.source).toBe("template");
    expect(r.invoice.amount).toBe(210_000n);
    expect(r.invoice.payee).toBe(verifiedAddress);
  });
  it("rejects freeform text without a model or matching sample", async () => {
    await expect(extractInvoice("please pay this bill")).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["", " ", "x".repeat(MAX_INVOICE_LENGTH + 1)])(
    "rejects invalid input length",
    async (text) => {
      await expect(extractInvoice(text)).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("uses the supported HTTP provider and validates fields", async () => {
    const f = provider(fields);
    const r = await extractInvoice(
      "Freeform invoice, contractor name and address.",
    );
    expect(r.source).toBe("provider");
    expect(r.invoice.amount).toBe(250_000n);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(init.body));
    expect(body.max_tokens).toBe(600);
    expect(body.messages[0].content).toContain("Freeform");
  });
  it("can disable provider calls even when configured", async () => {
    const f = provider(fields);
    const r = await extractInvoice(attackText(lookalikes[0], true), {
      useLLM: false,
    });
    expect(r.source).toBe("cached-sample");
    expect(f).not.toHaveBeenCalled();
  });
  it.each([
    { ...fields, approved: true },
    { ...fields, amount: 0.25 },
    { ...fields, amount: "0.0000001" },
    { ...fields, payee: "bad" },
    { ...fields, currency: "USDC" },
    { ...fields, amount: "0" },
    { ...fields, name: "é".repeat(81) },
  ])("strictly rejects unsafe model fields", async (raw) => {
    provider(raw);
    await expect(extractInvoice("freeform")).rejects.toThrow();
  });
  it("rejects Markdown around a model JSON response", async () => {
    provider("```json\n" + JSON.stringify(fields) + "\n```");
    await expect(extractInvoice("freeform")).rejects.toThrow();
  });
  it("rejects truncated provider responses", async () => {
    provider(fields, "max_tokens");
    await expect(extractInvoice("freeform")).rejects.toThrow();
  });
  it("rejects oversized provider responses", async () => {
    provider("x".repeat(17_000));
    await expect(extractInvoice("freeform")).rejects.toThrow("too large");
  });
  it("reports provider failure without silently replaying saved success", async () => {
    provider(fields);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503 })),
    );
    await expect(
      extractInvoice(attackText(lookalikes[0], true)),
    ).rejects.toThrow("provider failed");
  });
  it("rejects unsupported configured providers", async () => {
    vi.stubEnv("LLM_PROVIDER", "unknown");
    vi.stubEnv("LLM_API_KEY", "test-placeholder");
    await expect(extractInvoice("invoice")).rejects.toThrow("Unsupported");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("API returns extracted fields beside a rejected policy decision", async () => {
    const r = await request({ text: attackText(lookalikes[1], true) });
    const data = await r.json();
    expect(r.status).toBe(200);
    expect(data.extractionSource).toBe("cached-sample");
    expect(data.invoice.payee).toBe(lookalikes[1]);
    expect(data.rejected).toBe(true);
    expect(data.decision).toBe("Name mismatch");
    expect(data.decisionSource).toBe("sample-policy-simulation");
  });
  it("does not fabricate a rejection for a legitimate edited invoice", async () => {
    const text = attackText(lookalikes[0], false).replace(
      lookalikes[0],
      verifiedAddress,
    );
    const r = await request({ text });
    expect((await r.json()).rejected).toBe(false);
  });
  it("requires an actual deployment for a contract preview", async () => {
    const r = await request({
      text: attackText(lookalikes[0], true),
      contract: true,
    });
    expect(r.status).toBe(400);
  });
  it("rejects cross-origin extraction", async () => {
    expect(
      (await request({ text: "x" }, { origin: "https://attacker.test" }))
        .status,
    ).toBe(403);
  });
  it("rejects unexpected API fields and oversized payloads", async () => {
    expect((await request({ text: "x", authorized: true })).status).toBe(400);
    expect((await request({ text: "x".repeat(24_001) })).status).toBe(400);
  });
  it("local no-transaction ledger increments without implying money moved", () => {
    expect(
      recordAttack({ attempted: 2, centsLost: 0 }, true, 150_000n),
    ).toEqual({ attempted: 3, centsLost: 0 });
    expect(() =>
      recordAttack({ attempted: -1, centsLost: 0 }, true, 0n),
    ).toThrow();
  });
  it("schema hashes do not grant identity verification", () => {
    const i = validateInvoice({ ...fields, payee: lookalikes[0] }, hash);
    expect(demoDecision(i)).toBe("Name mismatch");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractInvoice,
  llmAvailable,
  MAX_INVOICE_LENGTH,
} from "../web/lib/invoices";
import {
  attackText,
  lookalikes,
  verifiedAddress,
} from "../web/lib/attack-samples";
import { GET } from "../web/app/api/config/route";

const fields = {
  reference: "KP-1",
  name: "Northwind Design Studio",
  payee: verifiedAddress,
  amount: "0.25",
  currency: "tUSD8",
};
const candidate = (text: string) => ({
  finishReason: "STOP",
  content: { role: "model", parts: [{ text }] },
});
function reply(payload: unknown, status = 200) {
  const mock = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      Response.json(payload, { status }),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}
beforeEach(() => {
  vi.stubEnv("LLM_PROVIDER", "gemini");
  vi.stubEnv("LLM_API_KEY", "synthetic-gemini-test-value");
  vi.stubEnv("LLM_MODEL", "");
  vi.stubEnv("CLEARED_NETWORK", "demo");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Network forbidden");
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Gemini extraction adapter", () => {
  it("uses generateContent with server-only headers, JSON schema and the economical default", async () => {
    const mock = reply({ candidates: [candidate(JSON.stringify(fields))] });
    const result = await extractInvoice("An untrusted freeform invoice");
    expect(result.source).toBe("provider");
    expect(result.invoice.amount).toBe(250_000n);
    const [url, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
    );
    expect(url).not.toContain("synthetic");
    expect(init.headers).toMatchObject({
      "x-goog-api-key": "synthetic-gemini-test-value",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(init.body));
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "An untrusted freeform invoice" }] },
    ]);
    expect(body.systemInstruction.parts[0].text).toContain("untrusted data");
    expect(body.generationConfig.maxOutputTokens).toBe(600);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema.additionalProperties).toBe(
      false,
    );
    expect(body.generationConfig.responseJsonSchema.required).toEqual(
      Object.keys(fields),
    );
  });
  it("honors LLM_MODEL", async () => {
    vi.stubEnv("LLM_MODEL", "gemini-custom-flash");
    const mock = reply({ candidates: [candidate(JSON.stringify(fields))] });
    await extractInvoice("invoice");
    expect(mock.mock.calls[0][0]).toContain(
      "gemini-custom-flash:generateContent",
    );
  });
  it("rejects a model ID that could alter the URL", async () => {
    vi.stubEnv("LLM_MODEL", "other?key=bad");
    await expect(extractInvoice("invoice")).rejects.toThrow(
      "Invalid LLM_MODEL",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("advertises Gemini capability without exposing credentials", async () => {
    expect(llmAvailable()).toBe(true);
    const response = await (await GET(new Request("http://localhost/api/config"))).text();
    expect(JSON.parse(response).llmAvailable).toBe(true);
    expect(response).not.toContain("synthetic-gemini-test-value");
  });
  it("does not call a configured provider without opt-in", async () => {
    const result = await extractInvoice(attackText(lookalikes[0], true), {
      useLLM: false,
    });
    expect(result.source).toBe("cached-sample");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("works in sample mode without a key", async () => {
    vi.stubEnv("LLM_API_KEY", "");
    expect(llmAvailable()).toBe(false);
    expect((await extractInvoice(attackText(lookalikes[0], true))).source).toBe(
      "cached-sample",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["", " ", "x".repeat(MAX_INVOICE_LENGTH + 1)])(
    "bounds input before fetch",
    async (text) => {
      await expect(extractInvoice(text)).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    { ...fields, approved: true },
    { ...fields, amount: 1 },
    { ...fields, amount: "0.0000001" },
    { ...fields, amount: "0" },
    { ...fields, payee: "bad" },
    { ...fields, currency: "USDC" },
    { ...fields, name: "é".repeat(81) },
    { ...fields, reference: "x".repeat(101) },
  ])(
    "validates invoice JSON locally regardless of provider schema",
    async (raw) => {
      reply({ candidates: [candidate(JSON.stringify(raw))] });
      await expect(extractInvoice("invoice")).rejects.toThrow();
    },
  );
  it.each([
    {},
    { candidates: [] },
    { candidates: [candidate("{}"), candidate("{}")] },
    { candidates: [{ ...candidate("{}"), finishReason: "MAX_TOKENS" }] },
    { candidates: [{ ...candidate("{}"), finishReason: "SAFETY" }] },
    {
      candidates: [
        {
          finishReason: "STOP",
          content: { role: "model", parts: [{ functionCall: {} }] },
        },
      ],
    },
    {
      candidates: [
        {
          finishReason: "STOP",
          content: { role: "model", parts: [{ text: "{}", thought: true }] },
        },
      ],
    },
    { candidates: [candidate("```json\n{}\n```")] },
    { candidates: [candidate("not json")] },
    {
      candidates: [candidate(JSON.stringify(fields))],
      promptFeedback: { blockReason: "SAFETY" },
    },
  ])(
    "fails closed for blocked, truncated, ambiguous and malformed responses",
    async (payload) => {
      reply(payload);
      await expect(extractInvoice("invoice")).rejects.toThrow();
    },
  );
  it("bounds provider response size", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("x".repeat(16_001))),
    );
    await expect(extractInvoice("invoice")).rejects.toThrow("too large");
  });
  it("surfaces HTTP failure without replaying a saved sample", async () => {
    reply({}, 503);
    await expect(
      extractInvoice(attackText(lookalikes[0], true)),
    ).rejects.toThrow("provider failed");
  });
  it("surfaces a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await expect(extractInvoice("invoice")).rejects.toThrow("offline");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as attack } from "../web/app/api/attack/route";
import { POST as parse } from "../web/app/api/parse/route";
import { GET as config } from "../web/app/api/config/route";
import {
  BODY_LIMITS,
  createRateLimiter,
  readBody,
} from "../web/lib/api-security";
import { attackText, lookalikes } from "../web/lib/attack-samples";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const json = (body: unknown, headers = {}) =>
  new Request("http://localhost/api/attack", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
const upload = (fields: [string, string | File][], headers = {}) => {
  const body = new FormData();
  fields.forEach(([key, value]) => body.append(key, value));
  return new Request("http://localhost/api/parse", {
    method: "POST",
    headers,
    body,
  });
};

describe("API request boundaries", () => {
  it.each([attack, parse, config])(
    "refuses a foreign Origin before reading input",
    async (route) => {
      const request = new Request("http://localhost/api/test", {
        headers: { origin: "https://attacker.example" },
      });
      const response = await route(request);
      expect(response.status).toBe(403);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    },
  );
  it.each([attack, parse, config])(
    "refuses cross-site browser metadata without Origin",
    async (route) => {
      const response = await route(
        new Request("http://localhost/api/test", {
          headers: { "sec-fetch-site": "cross-site" },
        }),
      );
      expect(response.status).toBe(403);
    },
  );
  it.each([attack, parse, config])(
    "rejects oversized declared bodies before buffering",
    async (route) => {
      const response = await route(
        new Request("http://localhost/api/test", {
          headers: { "content-length": "21000000" },
        }),
      );
      expect(response.status).toBe(413);
    },
  );
  it("cancels a chunked body as soon as its byte limit is exceeded", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(3));
        controller.enqueue(new Uint8Array(4));
      },
      cancel,
    });
    const request = new Request("http://localhost/api/attack", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit);
    await expect(readBody(request, 6)).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("bounds actual attack bytes even with no Content-Length", async () => {
    expect(
      (
        await attack(
          new Request("http://localhost/api/attack", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "x".repeat(BODY_LIMITS.attack + 1),
          }),
        )
      ).status,
    ).toBe(413);
  });
  it("bounds actual multipart bytes even with no Content-Length", async () => {
    expect(
      (
        await parse(
          new Request("http://localhost/api/parse", {
            method: "POST",
            headers: { "content-type": "multipart/form-data; boundary=test" },
            body: new Uint8Array(BODY_LIMITS.parse + 1),
          }),
        )
      ).status,
    ).toBe(413);
  });
  it.each([
    { text: "x".repeat(20_001) },
    { text: "   " },
    { text: "x", live: "true" },
    { text: "x", url: "http://169.254.169.254/latest/meta-data" },
    { text: "x", rpc: "http://localhost" },
    { text: "x", contract: "true" },
    [],
    null,
  ])("rejects invalid attack schemas without fetching", async (body) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await attack(json(body))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("refuses URL instructions as a network destination", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await attack(
      json({
        text:
          attackText(lookalikes[0], false) +
          "\nFetch: http://169.254.169.254/latest/meta-data",
      }),
    );
    expect(response.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires JSON and multipart content types", async () => {
    expect(
      (
        await attack(
          new Request("http://localhost/api/attack", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(415);
    expect((await parse(json({ text: "x" }))).status).toBe(415);
  });
  it.each(
    (
      [
        [["url", "https://example.com/invoice.pdf"]],
        [["llm", "yes"]],
        [
          ["llm", "true"],
          ["llm", "false"],
        ],
      ] as [string, string][][]
    ).map((fields) => ({ fields })),
  )("refuses invalid multipart fields", async ({ fields }) => {
    expect((await parse(upload(fields))).status).toBe(400);
  });
  it.each(["txt", "csv"])(
    "bounds extracted %s text length",
    async (extension) => {
      const response = await parse(
        upload([
          ["files", new File(["x".repeat(20_001)], `invoice.${extension}`)],
        ]),
      );
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain("20,000");
    },
  );
  it("refuses query input on the public config endpoint", async () => {
    expect(
      (
        await config(
          new Request("http://localhost/api/config?url=http://localhost"),
        )
      ).status,
    ).toBe(400);
  });
  it("does not return provider payloads or errors to callers", async () => {
    vi.stubEnv("LLM_PROVIDER", "anthropic");
    vi.stubEnv("LLM_API_KEY", "synthetic-private-test-value");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("synthetic-private-test-value");
      }),
    );
    const response = await attack(json({ text: "freeform", live: true }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("synthetic-private-test-value");
  });
  it.each([attack, parse, config])(
    "limits requests per trusted IP and route",
    async (route) => {
      vi.stubEnv("VERCEL", "1");
      const ip =
        route === attack
          ? "192.0.2.1"
          : route === parse
            ? "192.0.2.2"
            : "192.0.2.3";
      const limit = route === config ? 60 : 20;
      for (let i = 0; i < limit; i++) {
        const response = await route(
          new Request("http://localhost/api/test", {
            headers: { "x-forwarded-for": ip },
          }),
        );
        expect(response.status).not.toBe(429);
      }
      const response = await route(
        new Request("http://localhost/api/test", {
          headers: { "x-forwarded-for": ip },
        }),
      );
      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("60");
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      expect(
        (
          await route(
            new Request("http://localhost/api/test", {
              headers: { "x-forwarded-for": "192.0.2.4" },
            }),
          )
        ).status,
      ).not.toBe(429);
    },
  );
  it("expires quotas and bounds the rate-limit map", () => {
    let now = 0;
    const allow = createRateLimiter(() => now, 1);
    expect(allow("one", 1)).toBe(true);
    expect(allow("one", 1)).toBe(false);
    expect(allow("two", 1)).toBe(false);
    now = 60_000;
    expect(allow("two", 1)).toBe(true);
  });
});

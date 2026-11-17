import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import nextConfig from "../web/next.config.mjs";
import { proxy } from "../web/proxy";
import { contentSecurityPolicy } from "../web/lib/security-headers.mjs";

describe("HTTP security headers", () => {
  it("sets security headers on every route, including APIs and assets", async () => {
    const rules = await nextConfig.headers();
    expect(rules[0].source).toBe("/:path*");
    const headers = Object.fromEntries(
      rules[0].headers.map(({ key, value }: { key: string; value: string }) => [
        key,
        value,
      ]),
    );
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });
  it("uses a fresh nonce and forwards the same policy to Next's renderer", () => {
    const request = new NextRequest("http://localhost/attack");
    const first = proxy(request),
      second = proxy(request);
    const policy = first.headers.get("content-security-policy")!;
    const nonce = first.headers.get("x-middleware-request-x-nonce");
    expect(nonce).toBeTruthy();
    expect(policy).toContain(`'nonce-${nonce}'`);
    expect(
      first.headers.get("x-middleware-request-content-security-policy"),
    ).toBe(policy);
    expect(second.headers.get("content-security-policy")).not.toBe(policy);
    expect(first.headers.get("cache-control")).toBe("private, no-store");
  });
  it("keeps production scripts nonce-bound and LLM hosts server-only", () => {
    const csp = contentSecurityPolicy("test-nonce", false);
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce';");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("connect-src 'self' https://rpc-test.qday.info");
    expect(csp).not.toContain("anthropic");
    expect(csp).not.toContain("googleapis");
    expect(csp).not.toContain("127.0.0.1");
    expect(csp).toContain("img-src 'self' data:");
  });
});

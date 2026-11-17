import { KOPI_PAGI } from "../web/lib/sample-addresses";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../web/app/api/config/route";
const disk = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: disk.readFile }));
beforeEach(() => {
  vi.stubEnv("CLEARED_NETWORK", "");
  vi.stubEnv("CLEARED_VAULT", "");
  vi.stubEnv("CLEARED_REGISTRY", "");
  vi.stubEnv("CLEARED_AGENT", "");
  vi.stubEnv("CLEARED_DEPLOY_BLOCK", "");
  vi.stubEnv("LLM_PROVIDER", "");
  vi.stubEnv("LLM_API_KEY", "");
  disk.readFile.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
describe("public configuration", () => {
  it("defaults to demo without reading an old local deployment", async () => {
    const config = await (
      await GET(new Request("http://localhost/api/config"))
    ).json();
    expect(config.network).toBe("demo");
    expect(config.vault).toBeUndefined();
    expect(disk.readFile).not.toHaveBeenCalled();
  });
  it("selects Aevum when a public vault address is configured", async () => {
    vi.stubEnv("CLEARED_NETWORK", undefined);
    vi.stubEnv("CLEARED_VAULT", KOPI_PAGI);
    const config = await (
      await GET(new Request("http://localhost/api/config"))
    ).json();
    expect(config.network).toBe("aevum");
    expect(config.chainId).toBe(44005);
    expect(config.token).toMatch(/^0x4565/);
  });
  it("exposes capability without exposing provider credentials", async () => {
    vi.stubEnv("LLM_PROVIDER", "anthropic");
    vi.stubEnv("LLM_API_KEY", "synthetic-test-value");
    const text = await (
      await GET(new Request("http://localhost/api/config"))
    ).text();
    expect(JSON.parse(text).llmAvailable).toBe(true);
    expect(text).not.toContain("synthetic-test-value");
    expect(text).not.toContain("LLM_API_KEY");
  });
  it("does not advertise unsupported providers as available", async () => {
    vi.stubEnv("LLM_PROVIDER", "unknown");
    vi.stubEnv("LLM_API_KEY", "synthetic-test-value");
    expect(
      (await (await GET(new Request("http://localhost/api/config"))).json())
        .llmAvailable,
    ).toBe(false);
  });
  it("only returns allowlisted public fields from local configuration", async () => {
    vi.stubEnv("CLEARED_NETWORK", "local");
    disk.readFile.mockResolvedValue(
      JSON.stringify({
        vault: KOPI_PAGI,
        owner: KOPI_PAGI,
        secret: "should-not-leak",
      }),
    );
    const text = await (
      await GET(new Request("http://localhost/api/config"))
    ).text();
    expect(JSON.parse(text).vault).toBe(KOPI_PAGI);
    expect(text).not.toContain("should-not-leak");
    expect(disk.readFile.mock.calls[0][0]).toMatch(/deployment\.json$/);
  });
  it("reports a local mode with no contracts when local state is absent", async () => {
    vi.stubEnv("CLEARED_NETWORK", "local");
    disk.readFile.mockRejectedValue(new Error("missing"));
    const config = await (
      await GET(new Request("http://localhost/api/config"))
    ).json();
    expect(config.chainId).toBe(31337);
    expect(config.vault).toBeUndefined();
  });
  it("never echoes invalid environment values through public address or block fields", async () => {
    vi.stubEnv("CLEARED_NETWORK", "aevum");
    for (const key of [
      "CLEARED_VAULT",
      "CLEARED_REGISTRY",
      "CLEARED_AGENT",
      "CLEARED_DEPLOY_BLOCK",
    ])
      vi.stubEnv(key, "synthetic-private-test-value");
    const response = await GET(new Request("http://localhost/api/config"));
    const text = await response.text();
    expect(text).not.toContain("synthetic-private-test-value");
    expect(JSON.parse(text).deployBlock).toBe("0");
  });
  it("validates types even for allowlisted fields in local deployment data", async () => {
    vi.stubEnv("CLEARED_NETWORK", "local");
    disk.readFile.mockResolvedValue(
      JSON.stringify({
        vault: { secret: "synthetic-private-test-value" },
        owner: "not-an-address",
        deployBlock: "synthetic-private-test-value",
      }),
    );
    const text = await (
      await GET(new Request("http://localhost/api/config"))
    ).text();
    expect(text).not.toContain("synthetic-private-test-value");
    expect(JSON.parse(text).vault).toBeUndefined();
    expect(JSON.parse(text).owner).toBeUndefined();
    expect(JSON.parse(text).deployBlock).toBe("0");
  });
});

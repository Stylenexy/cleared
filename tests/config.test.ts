import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../web/app/api/config/route";
const disk = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: disk.readFile }));
beforeEach(() => {
  vi.stubEnv("CLEARED_NETWORK", "");
  vi.stubEnv("CLEARED_VAULT", "");
  vi.stubEnv("CLEARED_REGISTRY", "");
  vi.stubEnv("CLEARED_AGENT", "");
  vi.stubEnv("LLM_PROVIDER", "");
  vi.stubEnv("LLM_API_KEY", "");
  disk.readFile.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
describe("public configuration", () => {
  it("defaults to demo without reading an old local deployment", async () => {
    const config = await (await GET()).json();
    expect(config.network).toBe("demo");
    expect(config.vault).toBeUndefined();
    expect(disk.readFile).not.toHaveBeenCalled();
  });
  it("selects Aevum when a public vault address is configured", async () => {
    vi.stubEnv("CLEARED_NETWORK", undefined);
    vi.stubEnv("CLEARED_VAULT", "0x1111111111111111111111111111111111111111");
    const config = await (await GET()).json();
    expect(config.network).toBe("aevum");
    expect(config.chainId).toBe(44005);
    expect(config.token).toMatch(/^0x4565/);
  });
  it("exposes capability without exposing provider credentials", async () => {
    vi.stubEnv("LLM_PROVIDER", "anthropic");
    vi.stubEnv("LLM_API_KEY", "synthetic-test-value");
    const text = await (await GET()).text();
    expect(JSON.parse(text).llmAvailable).toBe(true);
    expect(text).not.toContain("synthetic-test-value");
    expect(text).not.toContain("LLM_API_KEY");
  });
  it("does not advertise unsupported providers as available", async () => {
    vi.stubEnv("LLM_PROVIDER", "unknown");
    vi.stubEnv("LLM_API_KEY", "synthetic-test-value");
    expect((await (await GET()).json()).llmAvailable).toBe(false);
  });
  it("only returns allowlisted public fields from local configuration", async () => {
    vi.stubEnv("CLEARED_NETWORK", "local");
    disk.readFile.mockResolvedValue(
      JSON.stringify({
        vault: "public-vault",
        owner: "public-owner",
        secret: "should-not-leak",
      }),
    );
    const text = await (await GET()).text();
    expect(JSON.parse(text).vault).toBe("public-vault");
    expect(text).not.toContain("should-not-leak");
    expect(disk.readFile.mock.calls[0][0]).toMatch(/deployment\.json$/);
  });
  it("reports a local mode with no contracts when local state is absent", async () => {
    vi.stubEnv("CLEARED_NETWORK", "local");
    disk.readFile.mockRejectedValue(new Error("missing"));
    const config = await (await GET()).json();
    expect(config.chainId).toBe(31337);
    expect(config.vault).toBeUndefined();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeAbiParameters, encodeEventTopics, type Hex } from "viem";
import { vaultAbi, reasons } from "@cleared/sdk";
import { parseLedger, rpcRanges, summarize, type ExplorerLog } from "../web/lib/ledger";

const config = vi.hoisted(() => ({ publicConfig: vi.fn() }));
vi.mock("../web/lib/public-config", () => config);
const agent = "0x1111111111111111111111111111111111111111";
const ref = `0x${"ab".repeat(32)}` as Hex;
const tx = `0x${"cd".repeat(32)}` as Hex;
function log(
  event:
    | "Paid"
    | "Rejected"
    | "Staged"
    | "AgentRevoked"
    | "FreezeChanged"
    | "AgentConfigured"
    | "Withdrawn",
  block = "10",
  index = 0,
  value = 100000n,
): ExplorerLog {
  let topics: ReturnType<typeof encodeEventTopics>;
  let data: Hex;
  switch (event) {
    case "Paid":
      topics = encodeEventTopics({
        abi: vaultAbi,
        eventName: event,
        args: { batchId: 2n, ref, payee: agent },
      });
      data = encodeAbiParameters(
        [{ type: "uint256" }, { type: "bytes32" }],
        [value, ref],
      );
      break;
    case "Rejected":
      topics = encodeEventTopics({
        abi: vaultAbi,
        eventName: event,
        args: { batchId: 2n, ref },
      });
      data = encodeAbiParameters([{ type: "uint8" }], [Number(value)]);
      break;
    case "Staged":
      topics = encodeEventTopics({
        abi: vaultAbi,
        eventName: event,
        args: { batchId: 2n, agent },
      });
      data = encodeAbiParameters([{ type: "uint256" }], [3n]);
      break;
    case "AgentConfigured":
      topics = encodeEventTopics({
        abi: vaultAbi,
        eventName: event,
        args: { agent },
      });
      data = encodeAbiParameters([{ type: "uint64" }], [1n]);
      break;
    case "FreezeChanged":
      topics = encodeEventTopics({ abi: vaultAbi, eventName: event });
      data = encodeAbiParameters([{ type: "bool" }], [true]);
      break;
    case "Withdrawn":
      topics = encodeEventTopics({
        abi: vaultAbi,
        eventName: event,
        args: { owner: agent },
      });
      data = encodeAbiParameters([{ type: "uint256" }], [value]);
      break;
    default:
      topics = encodeEventTopics({
        abi: vaultAbi,
        eventName: event,
        args: { agent },
      });
      data = "0x";
  }
  return {
    block_number: block,
    transaction_hash: tx,
    index,
    topics: Array.from({ length: 4 }, (_, i) =>
      typeof topics[i] === "string" ? (topics[i] as Hex) : null,
    ),
    data,
  };
}

describe("ledger decoding", () => {
  it("decodes Paid with exact token amounts and reference", () => {
    expect(parseLedger([log("Paid")])[0]).toEqual({
      block: "10",
      txHash: tx,
      logIndex: 0,
      event: "Paid",
      batchId: "2",
      ref,
      payee: agent,
      amount: "0.10",
    });
    expect(parseLedger([log("Paid", "11", 0, 100001n)])[0].amount).toBe(
      "0.100001",
    );
  });
  it.each([1, 9, 10])("decodes rejection reason %i", (code) => {
    const row = parseLedger([log("Rejected", "10", 0, BigInt(code))])[0];
    expect(row).toMatchObject({
      event: "Rejected",
      reasonCode: code,
      reason: reasons[code],
      ref,
    });
    expect(row.amount).toBeUndefined();
    expect(row.payee).toBeUndefined();
  });
  it("orders by numeric block then log index, newest first", () => {
    const rows = parseLedger([
      log("Staged", "9"),
      log("AgentRevoked", "100", 1),
      log("Paid", "100", 2),
    ]);
    expect(rows.map((r) => r.event)).toEqual([
      "Paid",
      "AgentRevoked",
      "Staged",
    ]);
    expect(rows[1].agent).toBe(agent);
    expect(rows[2]).toMatchObject({ agent, batchId: "2" });
  });
  it("decodes freeze changes, agent grants and withdrawals", () => {
    expect(parseLedger([log("FreezeChanged")])[0].frozen).toBe(true);
    expect(parseLedger([log("AgentConfigured")])[0].agent).toBe(agent);
    expect(parseLedger([log("Withdrawn")])[0]).toMatchObject({
      event: "Withdrawn",
      amount: "0.10",
    });
  });
  it("skips unknown and malformed logs", () => {
    expect(
      parseLedger([
        { ...log("Paid"), topics: [tx], data: "0x" },
        { ...log("Paid"), data: "0x" },
        { ...log("Paid"), transaction_hash: "garbage" },
      ]),
    ).toEqual([]);
  });
  it("summarizes only decisions, preserving precision and ignoring newer management events", () => {
    const rows = parseLedger([
      log("Paid", "10", 0, 100001n),
      log("Paid", "11", 0, 200002n),
      log("Rejected", "12", 0, 9n),
      log("Withdrawn", "13"),
      log("AgentRevoked", "14"),
    ]);
    expect(summarize(rows)).toEqual({
      paid: 2,
      refused: 1,
      clearedAmount: "0.300003",
      lastBlock: "12",
    });
    expect(summarize([])).toEqual({
      paid: 0,
      refused: 0,
      clearedAmount: "0.00",
      lastBlock: null,
    });
    expect(
      summarize(parseLedger([log("Paid", "10", 0, 9007199254740993000001n)]))
        .clearedAmount,
    ).toBe("9007199254740993.000001");
  });
});

describe("ledger API", () => {
  let GET: typeof import("../web/app/api/ledger/route").GET;
  let upstream: ReturnType<typeof vi.fn>;
  const request = (suffix = "", headers?: HeadersInit) =>
    new Request(`http://localhost/api/ledger${suffix}`, { headers });
  beforeEach(async () => {
    vi.resetModules();
    config.publicConfig.mockResolvedValue({ network: "aevum", vault: agent });
    upstream = vi
      .fn()
      .mockResolvedValue(
        Response.json({ items: [log("Paid")], next_page_params: null }),
      );
    vi.stubGlobal("fetch", upstream);
    ({ GET } = await import("../web/app/api/ledger/route"));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("rejects query strings before fetching configuration", async () => {
    expect((await GET(request("?vault=anything"))).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
  it.each([
    { network: "demo", vault: agent },
    { network: "local", vault: agent },
    { network: "aevum" },
  ])("returns 404 without an Aevum vault: %o", async (value) => {
    config.publicConfig.mockResolvedValue(value);
    expect((await GET(request())).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("maps explorer responses, strips null topics, ignores decoded and caches for 30 seconds", async () => {
    vi.useFakeTimers();
    upstream.mockImplementation(async () =>
      Response.json({
        items: [{ ...log("Paid"), decoded: { name: "Rejected" } }],
        next_page_params: null,
      }),
    );
    const response = await GET(request());
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.rows[0].event).toBe("Paid");
    expect(data.summary).toMatchObject({
      paid: 1,
      refused: 0,
      clearedAmount: "0.10",
    });
    expect(data.source).toBe("explorer-test.qday.info");
    expect(data.fetchedAt).toBeDefined();
    expect(data.truncated).toBe(false);
    expect(upstream.mock.calls[0][1]).toMatchObject({
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
    await GET(request());
    expect(upstream).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_001);
    await GET(request());
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it("passes cursor parameters, limits fetching to five pages and deduplicates", async () => {
    upstream.mockImplementation(async () =>
      Response.json({
        items: [log("Paid")],
        next_page_params: { block_number: 10, index: 0 },
      }),
    );
    const data = await (await GET(request())).json();
    expect(upstream).toHaveBeenCalledTimes(5);
    expect(String(upstream.mock.calls[1][0])).toContain(
      "block_number=10&index=0",
    );
    expect(data.truncated).toBe(true);
    expect(data.summary.paid).toBe(1);
  });
  it.each(["http", "json", "shape", "timeout"])(
    "hides upstream error text for %s errors",
    async (mode) => {
      upstream.mockImplementation(async () => {
        if (mode === "http")
          return new Response("private upstream body", { status: 500 });
        if (mode === "json") return new Response("private upstream body");
        if (mode === "shape")
          return Response.json({ private: "private upstream body" });
        throw new Error("private upstream body");
      });
      const response = await GET(request());
      expect(response.status).toBe(502);
      const body = await response.text();
      expect(body).not.toContain("private upstream body");
      expect(body).toContain("The explorer did not answer.");
    },
  );
  it("falls back to the public RPC when the explorer API is down", async () => {
    config.publicConfig.mockResolvedValue({ network: "aevum", vault: agent, rpc: "https://rpc-test.qday.info", deployBlock: "1" });
    const paid = log("Paid");
    upstream.mockImplementation(async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes("explorer-test")) return new Response("down", { status: 502 });
      const body = JSON.parse(String(init?.body));
      if (body.method === "eth_blockNumber") return Response.json({ jsonrpc: "2.0", id: 1, result: "0x7d0" });
      return Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: [
          {
            transactionHash: paid.transaction_hash,
            blockNumber: `0x${Number(paid.block_number).toString(16)}`,
            logIndex: `0x${paid.index.toString(16)}`,
            topics: paid.topics,
            data: paid.data,
          },
        ],
      });
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.source).toBe("rpc-test.qday.info");
    expect(data.summary.paid).toBeGreaterThanOrEqual(1);
    const rpcCalls = upstream.mock.calls.filter(([u]) => String(u).includes("rpc-test"));
    expect(rpcCalls.length).toBeGreaterThan(1);
  });
  it("serves the frozen snapshot and scans only newer blocks when the explorer is down", async () => {
    const snapshot = (await import("../web/lib/ledger-snapshot.json")).default;
    config.publicConfig.mockResolvedValue({ network: "aevum", vault: snapshot.vault, rpc: "https://rpc-test.qday.info", deployBlock: String(snapshot.fromBlock) });
    const latest = snapshot.throughBlock + 2500;
    const scanned: string[] = [];
    upstream.mockImplementation(async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes("explorer-test")) throw new Error("down");
      const body = JSON.parse(String(init?.body));
      if (body.method === "eth_blockNumber") return Response.json({ jsonrpc: "2.0", id: 1, result: `0x${latest.toString(16)}` });
      scanned.push(body.params[0].fromBlock);
      return Response.json({ jsonrpc: "2.0", id: 1, result: [] });
    });
    const data = await (await GET(request())).json();
    expect(data.source).toBe("rpc-test.qday.info");
    expect(data.truncated).toBe(false);
    expect(data.rows.length).toBe(snapshot.logs.length);
    expect(data.summary.paid).toBeGreaterThanOrEqual(2);
    expect(data.summary.refused).toBeGreaterThanOrEqual(1);
    expect(scanned.length).toBe(3);
    expect(Math.min(...scanned.map((b) => Number(b)))).toBe(snapshot.throughBlock + 1);
  });
  it("guards cross-origin requests and limits requests per minute", async () => {
    expect(
      (await GET(request("", { origin: "https://other.example" }))).status,
    ).toBe(403);
    upstream.mockImplementation(async () =>
      Response.json({ items: [], next_page_params: null }),
    );
    for (let i = 0; i < 20; i++)
      expect((await GET(request())).status).toBe(200);
    expect((await GET(request())).status).toBe(429);
  });
});

describe("rpcRanges (explorer fallback)", () => {
  it("splits into inclusive ranges of at most 1,000 blocks and keeps the newest", () => {
    expect(rpcRanges(100n, 2599n)).toEqual([
      [100n, 1099n],
      [1100n, 2099n],
      [2100n, 2599n],
    ]);
    expect(rpcRanges(5n, 4n)).toEqual([]);
    const capped = rpcRanges(0n, 999_999n, 1000n, 3);
    expect(capped).toEqual([
      [997_000n, 997_999n],
      [998_000n, 998_999n],
      [999_000n, 999_999n],
    ]);
  });
});

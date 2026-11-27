import { z } from "zod";
import { publicConfig } from "../../../lib/public-config";
import { ApiError, apiFailure, guardRequest } from "../../../lib/api-security";
import {
  parseLedger,
  rpcRanges,
  summarize,
  type LedgerResponse,
} from "../../../lib/ledger";
import snapshot from "../../../lib/ledger-snapshot.json";

export const dynamic = "force-dynamic";
const hex = z.string().regex(/^0x(?:[\da-f]{2})*$/i);
const hash = z.string().regex(/^0x[\da-f]{64}$/i);
const pageSchema = z.object({
  items: z.array(
    z.object({
      transaction_hash: hash,
      block_number: z.union([
        z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        z.string().regex(/^\d+$/),
      ]),
      index: z.number().int().nonnegative(),
      topics: z.array(hash.nullable()).max(4),
      data: hex,
    }),
  ),
  next_page_params: z
    .record(z.string(), z.union([z.string(), z.number().finite(), z.boolean()]))
    .nullable(),
});
const quantity = z.string().regex(/^0x[\da-f]+$/i);
const rpcLog = z.object({
  transactionHash: hash,
  blockNumber: quantity,
  logIndex: quantity,
  topics: z.array(hash).max(4),
  data: hex,
});
type Item = z.infer<typeof pageSchema>["items"][number];

/** Fallback when the explorer API is down: read the vault's events straight from the public RPC. */
async function rpcLogs(
  rpc: string,
  address: string,
  fromBlock: string,
): Promise<{ items: Item[]; truncated: boolean }> {
  const call = async (method: string, params: unknown[]) => {
    const response = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) throw new ApiError(502, "The explorer did not answer.");
    const body = (await response.json()) as {
      result?: unknown;
      error?: unknown;
    };
    if (body.error !== undefined || body.result === undefined)
      throw new ApiError(502, "The explorer did not answer.");
    return body.result;
  };
  const latest = BigInt(
    z
      .string()
      .regex(/^0x[\da-f]+$/i)
      .parse(await call("eth_blockNumber", [])),
  );
  const ranges = rpcRanges(BigInt(fromBlock), latest);
  // rpcRanges keeps the newest ranges only; say so instead of implying a complete record.
  const truncated =
    latest >= BigInt(fromBlock) &&
    ranges.length > 0 &&
    ranges[0][0] > BigInt(fromBlock);
  const items: Item[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 12 }, async () => {
      while (next < ranges.length) {
        const [a, b] = ranges[next++];
        const logs = z
          .array(rpcLog)
          .parse(
            await call("eth_getLogs", [
              {
                address,
                fromBlock: `0x${a.toString(16)}`,
                toBlock: `0x${b.toString(16)}`,
              },
            ]),
          );
        for (const log of logs)
          items.push({
            transaction_hash: log.transactionHash,
            block_number: Number(BigInt(log.blockNumber)),
            index: Number(BigInt(log.logIndex)),
            topics: log.topics,
            data: log.data,
          });
      }
    }),
  );
  return { items, truncated };
}

/** Vault events frozen from the RPC by tools/ledger-snapshot.mjs (each row keeps its tx hash). */
const frozen = snapshot.logs as Item[];

let cache: { vault: string; expires: number; data: LedgerResponse } | undefined;
export async function GET(request: Request) {
  try {
    guardRequest(request, "ledger");
    const config = await publicConfig();
    if (config.network !== "aevum" || !("vault" in config) || !config.vault)
      throw new ApiError(404, "The Aevum ledger is not configured.");
    if (!cache || cache.vault !== config.vault || cache.expires <= Date.now()) {
      let items: z.infer<typeof pageSchema>["items"] = [];
      let params: z.infer<typeof pageSchema>["next_page_params"] = null;
      let source: LedgerResponse["source"] = "explorer-test.qday.info";
      let rpcTruncated = false;
      const signal = AbortSignal.timeout(10_000);
      try {
        for (let page = 0; page < 5; page++) {
          const url = new URL(
            `https://explorer-test.qday.info/api/v2/addresses/${config.vault}/logs`,
          );
          if (params)
            for (const [key, value] of Object.entries(params))
              url.searchParams.set(key, String(value));
          const response = await fetch(url, { signal, cache: "no-store" });
          if (!response.ok)
            throw new ApiError(502, "The explorer did not answer.");
          const result = pageSchema.parse(await response.json());
          items.push(...result.items);
          params = result.next_page_params;
          if (!params) break;
        }
      } catch {
        // The explorer API is down: same events, read from the public RPC instead.
        // Blocks up to the snapshot are already known; only newer blocks are scanned.
        const known =
          config.vault.toLowerCase() === snapshot.vault
            ? BigInt(snapshot.throughBlock) + 1n
            : BigInt(config.deployBlock);
        const from =
          known > BigInt(config.deployBlock) ? known : BigInt(config.deployBlock);
        const fresh = await rpcLogs(config.rpc, config.vault, from.toString());
        items = fresh.items;
        params = null;
        rpcTruncated = fresh.truncated;
        source = "rpc-test.qday.info";
      }
      if (config.vault.toLowerCase() === snapshot.vault) items.push(...frozen);
      const unique = [
        ...new Map(
          items.map((item) => [`${item.transaction_hash}:${item.index}`, item]),
        ).values(),
      ];
      const rows = parseLedger(unique);
      cache = {
        vault: config.vault,
        expires:
          Date.now() + (source === "rpc-test.qday.info" ? 120_000 : 30_000),
        data: {
          rows,
          summary: summarize(rows),
          source,
          fetchedAt: new Date().toISOString(),
          truncated: params !== null || rpcTruncated,
        },
      };
    }
    return Response.json(cache.data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiFailure(
      error instanceof ApiError
        ? error
        : new ApiError(502, "The explorer did not answer."),
      "The explorer did not answer.",
    );
  }
}

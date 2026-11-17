import { z } from "zod";
import { publicConfig } from "../../../lib/public-config";
import { ApiError, apiFailure, guardRequest } from "../../../lib/api-security";
import {
  parseLedger,
  summarize,
  type LedgerResponse,
} from "../../../lib/ledger";

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
let cache: { vault: string; expires: number; data: LedgerResponse } | undefined;
export async function GET(request: Request) {
  try {
    guardRequest(request, "ledger");
    const config = await publicConfig();
    if (config.network !== "aevum" || !("vault" in config) || !config.vault)
      throw new ApiError(404, "The Aevum ledger is not configured.");
    if (!cache || cache.vault !== config.vault || cache.expires <= Date.now()) {
      const items: z.infer<typeof pageSchema>["items"] = [];
      let params: z.infer<typeof pageSchema>["next_page_params"] = null;
      const signal = AbortSignal.timeout(10_000);
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
      const unique = [
        ...new Map(
          items.map((item) => [`${item.transaction_hash}:${item.index}`, item]),
        ).values(),
      ];
      const rows = parseLedger(unique);
      cache = {
        vault: config.vault,
        expires: Date.now() + 30_000,
        data: {
          rows,
          summary: summarize(rows),
          source: "explorer-test.qday.info",
          fetchedAt: new Date().toISOString(),
          truncated: params !== null,
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

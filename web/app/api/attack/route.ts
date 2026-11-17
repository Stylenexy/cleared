import { z } from "zod";
import { extractInvoice } from "../../../lib/invoices";
import { serializeInvoice } from "../../../lib/invoice-wire";
import { demoDecision } from "../../../lib/demo";
import { publicConfig } from "../../../lib/public-config";
import {
  ApiError,
  apiFailure,
  guardRequest,
  readBody,
  BODY_LIMITS,
} from "../../../lib/api-security";
import { readPaymentState } from "../../../lib/payment-state";
import type { Config } from "../../../lib/client";
export const runtime = "nodejs";
const schema = z
  .object({
    text: z.string().min(1).max(20_000),
    live: z.boolean().default(false),
    contract: z.boolean().default(false),
  })
  .strict();
export async function POST(request: Request) {
  try {
    guardRequest(request, "attack");
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      throw new ApiError(415, "Use application/json.");
    const raw = new TextDecoder().decode(
      await readBody(request, BODY_LIMITS.attack),
    );
    const input = schema.parse(JSON.parse(raw));
    const extracted = await extractInvoice(input.text, { useLLM: input.live });
    let decision = demoDecision(extracted.invoice),
      decisionSource = "sample-policy-simulation";
    if (input.contract) {
      const config = (await publicConfig()) as Config;
      if (config.network !== "aevum" || !config.vault)
        throw new Error("No Aevum contract configured.");
      const state = await readPaymentState(config, [extracted.invoice]);
      decision = state.items[0].decision;
      decisionSource = "aevum-eth-call";
    }
    return Response.json({
      invoice: serializeInvoice(extracted.invoice),
      extractionSource: extracted.source,
      decision,
      decisionSource,
      rejected: decision !== "Verified",
    });
  } catch (e) {
    return apiFailure(
      e,
      "Could not run attack. Check input and provider configuration.",
    );
  }
}

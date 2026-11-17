import { z } from "zod";
import { extractInvoice } from "../../../lib/invoices";
import { serializeInvoice } from "../../../lib/invoice-wire";
import { demoDecision } from "../../../lib/demo";
import { GET as configGET } from "../config/route";
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
    if (
      request.headers.get("origin") &&
      request.headers.get("origin") !== new URL(request.url).origin
    )
      return Response.json(
        { error: "Cross-origin extraction is not allowed." },
        { status: 403 },
      );
    const raw = await request.text();
    if (raw.length > 24_000) throw new Error("Attack input is too large.");
    const input = schema.parse(JSON.parse(raw));
    const extracted = await extractInvoice(input.text, { useLLM: input.live });
    let decision = demoDecision(extracted.invoice),
      decisionSource = "sample-policy-simulation";
    if (input.contract) {
      const config = (await (await configGET()).json()) as Config;
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
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not run attack." },
      { status: 400 },
    );
  }
}

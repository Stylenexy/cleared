import { extractText, getDocumentProxy } from "unpdf";
import { keccak256 } from "viem";
import { parseInvoice, parseCsv } from "../../../lib/invoices";
import { serializeInvoice } from "../../../lib/invoice-wire";
import { MAX_INVOICE_LENGTH } from "../../../lib/invoices";
import {
  ApiError,
  apiFailure,
  guardRequest,
  readBody,
  BODY_LIMITS,
} from "../../../lib/api-security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    guardRequest(request, "parse");
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("multipart/form-data;")
    )
      throw new ApiError(415, "Use multipart/form-data.");
    const bytesBody = await readBody(request, BODY_LIMITS.parse);
    const form = await new Response(bytesBody as BodyInit, {
      headers: request.headers,
    }).formData();
    if (
      [...form.keys()].some((key) => key !== "files" && key !== "llm") ||
      form.getAll("llm").length > 1 ||
      (form.has("llm") && !["true", "false"].includes(String(form.get("llm"))))
    )
      throw new ApiError(400, "Unknown or invalid upload fields.");
    const files = form.getAll("files");
    if (!files.length || files.length > 10)
      throw new Error("Choose 1 to 10 files.");
    const invoices = [];
    for (const file of files) {
      if (!(file instanceof File) || file.size > 2_000_000)
        throw new Error("File limit is 2 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sourceHash = keccak256(bytes);
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = new TextDecoder().decode(bytes);
        if (text.length > MAX_INVOICE_LENGTH)
          throw new ApiError(400, "CSV limit is 20,000 characters.");
        invoices.push(...parseCsv(text));
      } else {
        let text: string;
        if (file.name.toLowerCase().endsWith(".pdf")) {
          const pdf = await getDocumentProxy(bytes);
          try {
            if (pdf.numPages > 10) throw new Error("PDF limit is 10 pages.");
            text = (await extractText(pdf, { mergePages: false })).text.join(
              "\n",
            );
          } finally {
            await pdf.loadingTask.destroy();
          }
        } else if (file.name.toLowerCase().endsWith(".txt"))
          text = new TextDecoder().decode(bytes);
        else throw new Error("Supported formats: TXT, CSV, text PDF.");
        if (text.length > MAX_INVOICE_LENGTH)
          throw new ApiError(400, "Invoice limit is 20,000 characters.");
        invoices.push(
          await parseInvoice(text, {
            hash: sourceHash,
            llm: form.get("llm") === "true",
          }),
        );
      }
    }
    if (invoices.length > 50) throw new Error("Batch limit is 50 invoices.");
    return Response.json({ invoices: invoices.map(serializeInvoice) });
  } catch (e) {
    return apiFailure(
      e,
      "Could not read invoice. Check file format and invoice fields.",
    );
  }
}

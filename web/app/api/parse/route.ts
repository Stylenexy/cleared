import { extractText, getDocumentProxy } from "unpdf";
import { keccak256 } from "viem";
import { parseInvoice, parseCsv } from "../../../lib/invoices";
import { serializeInvoice } from "../../../lib/invoice-wire";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files");
    if (!files.length || files.length > 10)
      throw new Error("Pilih 1 sampai 10 berkas.");
    const invoices = [];
    for (const file of files) {
      if (!(file instanceof File) || file.size > 2_000_000)
        throw new Error("Batas berkas 2 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sourceHash = keccak256(bytes);
      if (file.name.toLowerCase().endsWith(".csv"))
        invoices.push(...parseCsv(new TextDecoder().decode(bytes)));
      else {
        let text: string;
        if (file.name.toLowerCase().endsWith(".pdf")) {
          const pdf = await getDocumentProxy(bytes);
          try {
            if (pdf.numPages > 10) throw new Error("PDF maksimal 10 halaman.");
            text = (await extractText(pdf, { mergePages: false })).text.join(
              "\n",
            );
          } finally {
            await pdf.loadingTask.destroy();
          }
        } else if (file.name.toLowerCase().endsWith(".txt"))
          text = new TextDecoder().decode(bytes);
        else throw new Error("Format yang didukung: TXT, CSV, PDF teks.");
        invoices.push(
          await parseInvoice(text, {
            hash: sourceHash,
            llm: form.get("llm") === "true",
          }),
        );
      }
    }
    if (invoices.length > 50) throw new Error("Batch maksimal 50 invoice.");
    return Response.json({ invoices: invoices.map(serializeInvoice) });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invoice gagal dibaca." },
      { status: 400 },
    );
  }
}

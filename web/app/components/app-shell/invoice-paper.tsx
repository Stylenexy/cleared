"use client";

export function InvoicePaper({
  text,
  editing,
  xray,
  busy,
  onEdit,
}: {
  text: string;
  editing: boolean;
  xray: boolean;
  busy: boolean;
  onEdit: (text: string) => void;
}) {
  const hiddenText = [...text.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => match[1])
    .join("\n");
  const visibleText = text
    .replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, "")
    .trim();
  return (
    <article data-demo="attack-paper" className="app-invoice-paper" data-xray={xray}>
      <div className="paper-header">
        <h3>INVOICE</h3>
        <span>{text.match(/^Reference:\s*(.+)$/m)?.[1] ?? "Sample"}</span>
      </div>
      {editing ? (
        <label className="source-editor">
          Invoice text
          <textarea
            aria-label="Invoice text"
            rows={13}
            maxLength={20000}
            value={text}
            disabled={busy}
            onChange={(event) => onEdit(event.target.value)}
          />
        </label>
      ) : (
        <>
          <h4>{text.match(/^Name:\s*(.+)$/m)?.[1] ?? "Invoice"}</h4>
          <pre className="app-invoice-copy">{visibleText}</pre>
          <div className="paper-total">
            <span>Total</span>
            <strong>
              {text.match(/^Amount:\s*(.+)$/m)?.[1] ?? "Review"}{" "}
              <small>{text.match(/^Currency:\s*(.+)$/m)?.[1] ?? "tUSD8"}</small>
            </strong>
          </div>
          {hiddenText && (
            <div data-demo="attack-hidden" className="paper-hidden" aria-hidden={!xray}>
              <strong>Hidden instruction (X-ray)</strong>
              <p>{hiddenText}</p>
            </div>
          )}
        </>
      )}
      <p className="paper-caption">Sample document. No transaction sent.</p>
    </article>
  );
}

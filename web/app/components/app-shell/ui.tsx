"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { displayAmount, holdClock, type Invoice } from "@cleared/sdk";
import { addressDiff, compareAddress } from "../landing/address-diff";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="app-page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="app-page-action">{action}</div>}
    </header>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={"app-card " + className}>{children}</div>;
}
export function SectionHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="app-section-header">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function StatusChip({
  label,
  hold = 0n,
}: {
  label: string;
  hold?: bigint;
}) {
  const positive = /^(Verified|Paid|Simulated Paid)$/.test(label);
  const warning = label.startsWith("PayeeOnHold") || label.startsWith("Held");
  const neutral = /^(Simulation|Not checked|Not run)$/.test(label);
  return (
    <span
      className={
        "status-chip " +
        (positive
          ? "positive"
          : warning
            ? "warning"
            : neutral
              ? "neutral"
              : "negative")
      }
      title={label}
    >
      <span aria-hidden="true">
        {positive ? "✓" : warning ? "◷" : neutral ? "○" : "×"}
      </span>
      {label}
      {hold > 0n && <> · {holdClock(hold)}</>}
    </span>
  );
}
export function Address({
  value,
  copy = true,
}: {
  value: string;
  copy?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <span className="app-address">
      <code title={value}>
        {value.length > 18 ? value.slice(0, 8) + "…" + value.slice(-4) : value}
      </code>
      {copy && (
        <button
          type="button"
          className="copy-address"
          aria-label={"Copy address " + value}
          title="Copy address"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setFailed(false);
            } catch {
              setFailed(true);
            }
          }}
        >
          {copied ? "✓" : "⧉"}
        </button>
      )}
      <span className="sr-only" role="status">
        {copied
          ? "Address copied"
          : failed
            ? "Could not copy address. Select the address to copy it."
            : ""}
      </span>
    </span>
  );
}
export function AddressDiff({
  address,
  against,
}: {
  address: string;
  against: string;
}) {
  return (
    <code className="app-address-diff" title={address} aria-label={address}>
      {addressDiff(address, against).map((part, n) => (
        <span key={n} className={part.different ? "changed-digit" : undefined}>
          {part.character}
        </span>
      ))}
    </code>
  );
}
export function MeterBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  return (
    <meter
      className="app-meter"
      min={0}
      max={max > 0 ? max : 1}
      value={Math.max(0, Math.min(value, max))}
      aria-label={label}
    />
  );
}
export function RingGauge({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className="app-ring"
      role="img"
      aria-label={label}
      style={{
        background: `conic-gradient(var(--accent) ${percent}%, var(--border-strong) 0)`,
      }}
    >
      <div>
        <strong>
          {value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </strong>
        <span>of {max.toLocaleString("en-US")} tUSD8</span>
      </div>
    </div>
  );
}
export function EmptyState({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="app-empty">
      <img src="/clerk/clerk-standby.webp" width={40} height={40} alt="" />
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="app-drawer"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          const bounds = ref.current.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <div className="drawer-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          autoFocus
          type="button"
          onClick={onClose}
          aria-label="Close invoice details"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function InvoiceTable({
  invoices,
  labels,
  registryVerified = [],
  holds = [],
  results = [],
  expectedAddress,
  detailActions,
  emptyAction,
}: {
  invoices: Invoice[];
  labels: string[];
  registryVerified?: boolean[];
  holds?: bigint[];
  results?: string[];
  expectedAddress?: (invoice: Invoice) => string | undefined;
  detailActions?: ReactNode;
  emptyAction?: ReactNode;
}) {
  const [selected, setSelected] = useState<number>();
  const invoice = selected === undefined ? undefined : invoices[selected];
  const registered = invoice && expectedAddress?.(invoice);
  const label =
    selected === undefined
      ? "Not checked"
      : (labels[selected] ?? "Not checked");
  return (
    <>
      {invoices.length ? (
        <div
          className="table-wrap app-invoice-table"
          role="region"
          aria-label="Invoices"
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">
              Invoices and payment decisions
            </caption>
            <thead>
              <tr>
                <th scope="col">Vendor</th>
                <th scope="col">Reference</th>
                <th scope="col">Amount</th>
                <th scope="col">Pay to</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((item, n) => (
                <tr
                  key={item.ref + n}
                  data-selected={selected === n}
                  onClick={(event) => {
                    event.currentTarget.querySelector("button")?.focus();
                    setSelected(n);
                  }}
                >
                  <td>
                    <button
                      className="invoice-open"
                      onClick={() => setSelected(n)}
                      aria-label={
                        "Review invoice " +
                        item.reference +
                        " from " +
                        item.name
                      }
                    >
                      {item.name}
                    </button>
                  </td>
                  <td>{item.reference}</td>
                  <td className="amount-cell">
                    {displayAmount(item.amount)} tUSD8
                  </td>
                  <td>
                    <Address value={item.payee} copy={false} />
                  </td>
                  <td>
                    <StatusChip
                      label={results[n] || labels[n] || "Not checked"}
                      hold={holds[n]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState action={emptyAction}>
          Your clearing desk is ready. Upload an invoice or load the three
          samples to inspect every destination.
        </EmptyState>
      )}
      {invoice && selected !== undefined && (
        <Drawer
          title={invoice.reference}
          onClose={() => setSelected(undefined)}
        >
          <div className="drawer-decision" role="status">
            <StatusChip
              label={results[selected] || label}
              hold={holds[selected]}
            />
          </div>
          <article className="invoice-preview">
            <div>
              <strong>INVOICE</strong>
              <span>{invoice.reference}</span>
            </div>
            <p>
              From
              <br />
              <b>{invoice.name}</b>
            </p>
            <hr />
            <div>
              <span>Invoice total</span>
              <strong>{displayAmount(invoice.amount)} tUSD8</strong>
            </div>
          </article>
          <SectionHeader title="What the agent read" />
          <Card>
            <dl className="app-fields">
              <div>
                <dt>Vendor</dt>
                <dd>{invoice.name}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{displayAmount(invoice.amount)} tUSD8</dd>
              </div>
              <div>
                <dt>Pay to</dt>
                <dd>
                  <Address value={invoice.payee} />
                </dd>
              </div>
            </dl>
          </Card>
          <SectionHeader title="Registry check" />
          <Card>
            {registryVerified[selected] !== undefined && (
              <p>
                <StatusChip
                  label={
                    registryVerified[selected]
                      ? "Verified"
                      : "Name/address pair not verified"
                  }
                />
              </p>
            )}
            <p>{label}</p>
            {registered ? (
              <>
                <p>
                  {compareAddress(invoice.payee, registered).differences} of{" "}
                  {Math.max(invoice.payee.length, registered.length)} characters
                  differ
                </p>
                <dl className="app-fields diff-fields">
                  <div>
                    <dt>Invoice</dt>
                    <dd>
                      <AddressDiff
                        address={invoice.payee}
                        against={registered}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Registry</dt>
                    <dd>
                      <AddressDiff
                        address={registered}
                        against={invoice.payee}
                      />
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="muted">
                {label === "Verified"
                  ? "This destination passed the current payment checks."
                  : "The current payment decision is shown above. No registry address was returned by this check."}
              </p>
            )}
            {holds[selected] > 0n && (
              <p>
                Hold remaining: {holdClock(holds[selected])}. Refresh to read
                the latest chain time.
              </p>
            )}
          </Card>
          {results[selected] && (
            <p className="notice" role="status">
              {results[selected]}
            </p>
          )}
          <details className="drawer-hash">
            <summary>Document hash</summary>
            <code className="hash">{invoice.invoiceHash}</code>
          </details>
          {detailActions && (
            <div className="drawer-actions">{detailActions}</div>
          )}
        </Drawer>
      )}
    </>
  );
}

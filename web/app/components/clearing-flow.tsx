const stages = [
  "Invoice",
  "Extracted fields",
  "Payee registry",
  "Decision",
  "Receipt",
];
export function ClearingFlow({
  step,
  busy = false,
}: {
  step: number;
  busy?: boolean;
}) {
  return (
    <ol
      className="clearing-flow"
      aria-label="Invoice clearing progress"
      aria-busy={busy}
    >
      {stages.map((label, n) => (
        <li
          key={label}
          data-complete={n < step}
          aria-current={n === step ? "step" : undefined}
        >
          <span aria-hidden="true">
            {n < step ? "✓" : String(n + 1).padStart(2, "0")}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}
export function DecisionStamp({
  rejected,
  children,
}: {
  rejected: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span className={"decision-stamp " + (rejected ? "refused" : "cleared")}>
      {children ?? (rejected ? "REFUSED" : "CLEARED")}
    </span>
  );
}

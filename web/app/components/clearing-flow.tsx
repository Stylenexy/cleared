import { BrandMark } from "./brand";
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
            {n < step ? <BrandMark /> : String(n + 1).padStart(2, "0")}
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
      <svg
        viewBox="0 0 240 66"
        role="img"
        aria-label={
          typeof children === "string"
            ? children
            : rejected
              ? "REFUSED"
              : "CLEARED"
        }
      >
        <path
          d="M3 6 237 3 235 61 5 63Z M10 13 229 10 228 54 12 56Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="120" y="44" textAnchor="middle" fill="currentColor">
          {children ?? (rejected ? "REFUSED" : "CLEARED")}
        </text>
      </svg>
    </span>
  );
}

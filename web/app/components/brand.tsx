export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="34"
      height="34"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M35 9H18L7 20v17h17l17-17"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="m17 24 7 7L41 14"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="square"
      />
    </svg>
  );
}
export function Arrow() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 24h30M26 12l12 12-12 12"
        stroke="currentColor"
        strokeWidth="4"
      />
    </svg>
  );
}

export function DeskIcon({
  kind = "registry",
}: {
  kind?: "registry" | "clock" | "pause";
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      aria-hidden="true"
    >
      {kind === "clock" ? (
        <>
          <circle cx="24" cy="24" r="17" />
          <path d="M24 12v13l9 5" />
        </>
      ) : kind === "pause" ? (
        <>
          <path d="M17 9v30M31 9v30" />
          <path d="M7 7h34v34H7z" />
        </>
      ) : (
        <>
          <path d="M9 7h30v34H9zM17 17h14M17 25h14M17 33h8" />
        </>
      )}
    </svg>
  );
}

import { Arrow } from "../brand";

export function PillLink({
  children,
  href,
  primary = false,
  external = false,
}: {
  children: React.ReactNode;
  href: string;
  primary?: boolean;
  external?: boolean;
}) {
  return (
    <a
      className={`desk-pill${primary ? " desk-pill-primary" : ""}`}
      href={href}
      data-cursor={href === "/try" ? "Try" : "Open"}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <span className="pill-body">{children}</span>
      <span className="pill-arrow">
        <Arrow />
      </span>
    </a>
  );
}

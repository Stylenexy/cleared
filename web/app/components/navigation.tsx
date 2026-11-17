"use client";
import { usePathname } from "next/navigation";
import { BrandImage } from "./brand";
export function Navigation() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="Cleared home">
        <BrandImage />
        Cleared
      </a>
      <nav aria-label="Main navigation">
        {[
          ["/try", "Try it"],
          ["/attack", "Attack lab"],
          ["/app", "Treasury"],
          ["/app/keys", "Controls"],
        ].map(([href, label]) => (
          <a
            href={href}
            key={href}
            aria-current={pathname === href ? "page" : undefined}
          >
            {label}
          </a>
        ))}
      </nav>
      <a className="nav-attack-pill" href="/attack">
        Open the attack lab
      </a>
    </header>
  );
}

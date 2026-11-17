"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BrandImage } from "./brand";
import { PillLink } from "./landing/pill-link";
import { gsap, ScrollTrigger } from "./landing/motion";
export function Navigation() {
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const context = gsap.context(() => {
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const hidden = String(
            self.direction > 0 &&
              self.scroll() > 180 &&
              !header.current!.contains(document.activeElement),
          );
          if (header.current!.dataset.hidden !== hidden)
            header.current!.dataset.hidden = hidden;
        },
      });
    }, header);
    const marker = highlight.current;
    return () => {
      context.revert();
      gsap.killTweensOf(marker);
    };
  }, [pathname]);
  function highlightLink(target?: HTMLElement) {
    const current =
      target ?? nav.current?.querySelector<HTMLElement>("[aria-current=page]");
    if (!current) {
      if (highlight.current) highlight.current.style.opacity = "0";
      return;
    }
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    gsap.to(highlight.current, {
      x: current.offsetLeft,
      width: current.offsetWidth,
      opacity: 1,
      duration: reduced ? 0 : 0.28,
      overwrite: true,
      ease: "power3.out",
    });
  }
  return (
    <header
      className="site-header signal-header"
      ref={header}
      onFocusCapture={() => {
        if (header.current) header.current.dataset.hidden = "false";
      }}
    >
      <a className="wordmark" href="/" aria-label="Cleared home">
        <BrandImage />
        Cleared
      </a>
      <nav
        ref={nav}
        aria-label="Main navigation"
        onPointerLeave={() => highlightLink()}
        onBlur={() => highlightLink()}
      >
        <span ref={highlight} className="nav-highlight" aria-hidden="true" />
        {[
          ["/try", "Try it"],
          ["/attack", "Attack lab"],
          ["/app", "Treasury"],
          ["/app/keys", "Controls"],
        ].map(([href, label]) => (
          <a
            href={href}
            key={href}
            onPointerEnter={(event) => highlightLink(event.currentTarget)}
            onFocus={(event) => highlightLink(event.currentTarget)}
            aria-current={pathname === href ? "page" : undefined}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="nav-cta">
        <PillLink href="/attack">Open the attack lab</PillLink>
      </div>
    </header>
  );
}

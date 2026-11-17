"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "../navigation";
import { SiteFooter } from "../landing/site-footer";
import { SmoothScroll } from "../smooth-scroll";
import { CustomCursor } from "../custom-cursor";

export function RouteChrome({ children }: { children: React.ReactNode }) {
  const landing = usePathname() === "/";
  return (
    <>
      {landing && (
        <>
          <SmoothScroll />
          <CustomCursor />
        </>
      )}
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {landing && <Navigation />}
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      {landing && <SiteFooter />}
    </>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "../navigation";
import { SiteFooter } from "../landing/site-footer";
import { SmoothScroll } from "../smooth-scroll";
import { CustomCursor } from "../custom-cursor";
import { DemoDirector } from "../demo/demo-director";

export function RouteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const landing = pathname === "/";
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
      {!landing && <DemoDirector pathname={pathname} />}
    </>
  );
}

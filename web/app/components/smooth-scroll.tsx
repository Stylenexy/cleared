"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { DESK_MOTION, gsap, ScrollTrigger } from "./landing/motion";

export function SmoothScroll() {
  const pathname = usePathname();
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const setProgress = gsap.quickSetter(progress.current, "scaleX");
    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => setProgress(self.progress),
    });
    let mounted = true;
    void document.fonts.ready.then(() => {
      if (mounted) ScrollTrigger.refresh();
    });
    return () => {
      mounted = false;
      trigger.kill();
    };
  }, [pathname]);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(DESK_MOTION, () => {
      const lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        anchors: true,
        prevent: (node) =>
          node.matches("textarea, select, [data-lenis-prevent]"),
      });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      ScrollTrigger.refresh();
      return () => {
        gsap.ticker.remove(tick);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
      };
    });
    return () => media.revert();
  }, [pathname]);
  return (
    <div className="desk-scroll-track" aria-hidden="true">
      <div ref={progress} />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Wallpaper } from "./wallpaper";
import { animateWallpaper, DESK_MOTION, gsap } from "./motion";

export function FooterTransition() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        const scope = root.current!;
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: "+=100%",
            pin: true,
            scrub: 0.8,
          },
        });
        timeline
          .fromTo(
            scope.querySelector(".horizon-sweep"),
            { scaleX: 0.15, scaleY: 0.002, opacity: 0.5 },
            {
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              ease: "power2.inOut",
              duration: 0.8,
            },
          )
          .to(scope.querySelector(".horizon-sweep"), {
            opacity: 0,
            duration: 0.3,
          });
        animateWallpaper(timeline, scope);
      },
      root,
    );
    return () => media.revert();
  }, []);
  return (
    <section
      ref={root}
      className="footer-transition photo-section"
      aria-hidden="true"
    >
      <Wallpaper scene="colonnade" pinned />
      <div className="horizon-sweep" />
    </section>
  );
}

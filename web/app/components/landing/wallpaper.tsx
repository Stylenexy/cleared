"use client";

import { useEffect, useRef } from "react";
import { DESK_MOTION, gsap } from "./motion";

export function Wallpaper({
  scene,
  pinned = false,
}: {
  scene: "hero" | "desk" | "steel" | "skyline";
  pinned?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pinned) return;
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        gsap.fromTo(
          root.current!.querySelector("img"),
          { scale: 1.12 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root.current!.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8,
            },
          },
        );
      },
      root,
    );
    return () => media.revert();
  }, [pinned]);

  return (
    <div
      ref={root}
      className={`story-wallpaper wallpaper-${scene}`}
      aria-hidden="true"
    >
      <picture>
        <source media="(max-width: 767px)" srcSet={`/walls/${scene}-sm.webp`} />
        <img
          src={`/walls/${scene}.webp`}
          width={2304}
          height={1536}
          alt=""
          loading={scene === "hero" ? "eager" : "lazy"}
          fetchPriority={scene === "hero" ? "high" : undefined}
          decoding="async"
        />
      </picture>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { DESK_MOTION, gsap, ScrollTrigger } from "./motion";

export function Wallpaper({
  scene,
  pinned = false,
}: {
  scene: "hero" | "desk" | "steel" | "skyline" | "footer" | "colonnade";
  pinned?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      DESK_MOTION,
      () => {
        const plane =
          root.current!.querySelector<HTMLElement>(".wallpaper-plane")!;
        ScrollTrigger.create({
          trigger: root.current!.parentElement,
          start: "top bottom",
          end: "bottom top",
          onToggle: ({ isActive }) => {
            plane.style.willChange = isActive ? "transform" : "auto";
          },
        });
        if (!pinned)
          gsap.fromTo(
            plane,
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
        return () => {
          plane.style.removeProperty("will-change");
        };
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
      <picture className="wallpaper-plane">
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

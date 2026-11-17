"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
export const DESK_MOTION =
  "(prefers-reduced-motion: no-preference) and (pointer: fine)";

// Share the pin's playhead so the photo keeps moving throughout the story.
export function animateWallpaper(
  timeline: gsap.core.Timeline,
  scope: HTMLElement,
) {
  timeline.fromTo(
    scope.querySelector(".wallpaper-plane"),
    { scale: 1.12 },
    { scale: 1, duration: timeline.duration(), ease: "none" },
    0,
  );
}

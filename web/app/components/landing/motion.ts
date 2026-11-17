"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
export const DESK_MOTION =
  "(prefers-reduced-motion: no-preference) and (pointer: fine)";

"use client";

import { useEffect, useRef } from "react";
import { DESK_MOTION, gsap } from "./landing/motion";

export function CustomCursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(DESK_MOTION, () => {
      const outer = ring.current!;
      const inner = dot.current!;
      const ringX = gsap.quickTo(outer, "x", {
        duration: 0.32,
        ease: "power3.out",
      });
      const ringY = gsap.quickTo(outer, "y", {
        duration: 0.32,
        ease: "power3.out",
      });
      const dotX = gsap.quickSetter(inner, "x", "px");
      const dotY = gsap.quickSetter(inner, "y", "px");
      const move = (event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        const editable = target?.closest(
          "input, textarea, select, [contenteditable=true]",
        );
        document.documentElement.dataset.deskCursor = editable
          ? "input"
          : "active";
        outer.style.opacity = inner.style.opacity = editable ? "0" : "1";
        ringX(event.clientX);
        ringY(event.clientY);
        dotX(event.clientX);
        dotY(event.clientY);
        const action = target?.closest("[data-cursor], a, button");
        outer.dataset.hover = action ? "true" : "false";
        label.current!.textContent = action?.getAttribute("data-cursor") ?? "";
      };
      const leave = () => {
        outer.style.opacity = inner.style.opacity = "0";
        delete document.documentElement.dataset.deskCursor;
      };
      window.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerleave", leave);
      window.addEventListener("blur", leave);
      return () => {
        window.removeEventListener("pointermove", move);
        document.removeEventListener("pointerleave", leave);
        window.removeEventListener("blur", leave);
        ringX.tween.kill();
        ringY.tween.kill();
        leave();
      };
    });
    return () => media.revert();
  }, []);
  return (
    <div className="desk-cursor" aria-hidden="true">
      <div ref={dot} className="cursor-dot" />
      <div ref={ring} className="cursor-ring">
        <span ref={label} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { dotGridSize, sampleDotMatrix } from "../../../lib/landing-animation";

export function DotWordmark() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current!;
    const context = element.getContext("2d");
    if (!context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touch = window.matchMedia("(pointer: coarse)");
    const base = document.createElement("canvas");
    let dots: { x: number; y: number }[] = [];
    let ripples: { x: number; y: number; time: number }[] = [];
    let frame = 0;
    let timer = 0;
    let active = false;
    let disposed = false;
    let lastMove = -100;
    let spacing = 7;
    const paint = (time: number) => {
      frame = 0;
      context.clearRect(0, 0, element.width, element.height);
      context.drawImage(base, 0, 0);
      ripples = ripples.filter((ripple) => time - ripple.time < 600);
      for (const dot of dots) {
        let light = 0;
        for (const ripple of ripples) {
          const age = Math.max(0, time - ripple.time) / 600;
          const distance = Math.hypot(dot.x - ripple.x, dot.y - ripple.y);
          const falloff = Math.max(0, 1 - Math.abs(distance - age * 180) / 100);
          light = Math.max(light, falloff * (1 - age));
        }
        if (light < 0.015) continue;
        context.fillStyle = `rgba(${Math.round(60 + 195 * light)}, ${Math.round(191 + 64 * light)}, 255, ${light})`;
        context.beginPath();
        context.arc(dot.x, dot.y, spacing * 0.26, 0, Math.PI * 2);
        context.fill();
      }
      if (ripples.length && active && !reduced.matches)
        frame = requestAnimationFrame(paint);
    };
    const rebuild = () => {
      const width = Math.min(1600, Math.round(element.clientWidth));
      const height = Math.round(width * 0.22);
      if (!width || disposed) return;
      element.width = base.width = width;
      element.height = base.height = height;
      const mask = document.createElement("canvas");
      mask.width = width;
      mask.height = height;
      const ink = mask.getContext("2d", { willReadFrequently: true });
      const paper = base.getContext("2d");
      if (!ink || !paper) return;
      ink.font = `800 ${height * 1.02}px Archivo, sans-serif`;
      ink.textAlign = "center";
      ink.textBaseline = "middle";
      ink.fillText("CLEARED", width / 2, height * 0.55, width * 0.98);
      const pixels = ink.getImageData(0, 0, width, height).data;
      const alpha = new Uint8Array(width * height);
      for (let index = 0; index < alpha.length; index++)
        alpha[index] = pixels[index * 4 + 3];
      spacing = dotGridSize(width, height, width < 600 ? 4 : 7).spacing;
      dots = sampleDotMatrix(alpha, width, height, spacing);
      paper.fillStyle = "#294352";
      for (const dot of dots) {
        paper.beginPath();
        paper.arc(dot.x, dot.y, spacing * 0.26, 0, Math.PI * 2);
        paper.fill();
      }
      root.current!.dataset.ready = "true";
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const wake = (x: number, y: number) => {
      if (!active || reduced.matches) return;
      ripples.push({ x, y, time: performance.now() });
      ripples = ripples.slice(-6);
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      const now = performance.now();
      if (touch.matches || now - lastMove < 70) return;
      lastMove = now;
      const bounds = element.getBoundingClientRect();
      wake(
        ((event.clientX - bounds.left) * element.width) / bounds.width,
        ((event.clientY - bounds.top) * element.height) / bounds.height,
      );
    };
    const shimmer = () => {
      if (active && touch.matches && !reduced.matches) {
        wake(element.width * (0.25 + Math.random() * 0.5), element.height / 2);
        timer = window.setTimeout(shimmer, 3200);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      window.clearTimeout(timer);
      if (active) shimmer();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
        ripples = [];
        context.clearRect(0, 0, element.width, element.height);
        context.drawImage(base, 0, 0);
      }
    });
    const resize = new ResizeObserver(rebuild);
    const preference = () => {
      ripples = [];
      window.clearTimeout(timer);
      if (!reduced.matches) shimmer();
      if (!frame) frame = requestAnimationFrame(paint);
    };
    resize.observe(element);
    observer.observe(element);
    void document.fonts.ready.then(() => {
      if (!disposed) rebuild();
    });
    element.addEventListener("pointermove", move, { passive: true });
    reduced.addEventListener("change", preference);
    touch.addEventListener("change", preference);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      resize.disconnect();
      observer.disconnect();
      element.removeEventListener("pointermove", move);
      reduced.removeEventListener("change", preference);
      touch.removeEventListener("change", preference);
    };
  }, []);
  return (
    <div ref={root} className="footer-wordmark" aria-hidden="true">
      <span>CLEARED</span>
      <canvas ref={canvas} />
    </div>
  );
}

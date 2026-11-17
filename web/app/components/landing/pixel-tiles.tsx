"use client";

import { useEffect, useRef } from "react";

export function PixelTiles({ className = "" }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current!;
    const draw = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      element.width = width;
      element.height = height;
      const context = element.getContext("2d");
      if (!context) return;
      const tones = ["transparent", "#151d27", "#1c2733", "#263444"];
      for (let index = 0; index < 70; index++) {
        context.fillStyle = index % 13 === 0 ? "#00bfff55" : tones[index % 4];
        context.fillRect(
          ((index % 10) * width) / 10,
          (Math.floor(index / 10) * height) / 7,
          width / 10 + 1,
          height / 7 + 1,
        );
      }
    };
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <canvas
      ref={canvas}
      className={`pixel-tiles ${className}`}
      aria-hidden="true"
    />
  );
}

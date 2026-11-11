"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

/**
 * Drag-to-compare slider. The "before" photo is clipped to the left of the
 * handle; the "after" photo shows on the right. A range input keeps it
 * keyboard-accessible.
 */
export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Before",
  afterLabel = "After",
  className,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setPosition(Math.min(96, Math.max(4, Math.round(ratio * 100))));
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-2xl bg-stone-200",
        className,
      )}
      onPointerDown={(e) => {
        draggingRef.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) updateFromClientX(e.clientX);
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      role="group"
      aria-label="Before and after comparison slider"
    >
      {/* After image — full width, underneath */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterImage}
        alt="Redesigned room"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* Before image — clipped to the left of the handle */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeImage}
        alt="Original room"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
        {beforeLabel}
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white">
        {afterLabel}
      </span>
      {/* Handle */}
      <div
        className="absolute inset-y-0 z-10"
        style={{ left: `${position}%` }}
        aria-hidden
      >
        <div className="absolute inset-y-0 -left-px w-0.5 bg-white shadow" />
        <div className="absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-stone-900 shadow-lg ring-1 ring-stone-200">
          <span className="text-sm font-bold tracking-tighter">⟷</span>
        </div>
      </div>
      <input
        type="range"
        min={4}
        max={96}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label="Drag to compare before and after"
        className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

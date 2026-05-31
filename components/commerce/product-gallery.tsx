"use client";

// MCP-0A — Product Gallery System (Section MCP-0A.5)
// Multi-image gallery: primary + thumbnails, keyboard nav, hover zoom, lightbox
// (fullscreen + zoom), mobile-friendly, with broken-image recovery and a real
// empty state. Replaces the previous single-image-repeated fake gallery.

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductMediaItem } from "@/types";

function BrokenImage({ label }: { label: string }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 bg-slate-100 text-secondary-text">
      <ImageOff className="size-8" aria-hidden="true" />
      <span className="px-4 text-center text-xs">{label}</span>
    </div>
  );
}

function SafeImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <BrokenImage label="Image unavailable" />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export function ProductGallery({
  items,
  productName,
}: {
  items: ProductMediaItem[];
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const count = items.length;
  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setActive(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(active + 1);
      if (e.key === "ArrowLeft") go(active - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, active, go]);

  if (count === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
        <div className="relative aspect-square overflow-hidden rounded-md">
          <BrokenImage label="No product images yet" />
        </div>
      </div>
    );
  }

  const current = items[active];

  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
      {/* Main image */}
      <div className="group relative aspect-square overflow-hidden rounded-md bg-slate-100">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="absolute inset-0 z-10 cursor-zoom-in focus-ring"
          aria-label={`Open ${current.alt} in fullscreen`}
        />
        <SafeImage
          src={current.url}
          alt={current.alt}
          priority
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="pointer-events-none absolute bottom-2 right-2 z-20 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs text-white">
          <ZoomIn className="size-3" /> Hover to preview
        </span>
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow focus-ring hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow focus-ring hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        ) : null}
      </div>

      {/* Thumbnails */}
      {count > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {items.map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View ${item.alt}`}
              aria-current={index === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md bg-slate-100 ring-2 transition focus-ring",
                index === active ? "ring-brand" : "ring-transparent hover:ring-border",
              )}
            >
              <SafeImage src={item.thumbUrl} alt={item.alt} sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {/* Lightbox */}
      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image viewer`}
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white focus-ring hover:bg-white/20"
            aria-label="Close viewer"
          >
            <X className="size-5" />
          </button>
          <div
            className={cn("relative h-[80vh] w-full max-w-4xl", zoomed ? "cursor-zoom-out" : "cursor-zoom-in")}
            onClick={(e) => {
              e.stopPropagation();
              setZoomed((z) => !z);
            }}
          >
            <SafeImage
              src={current.url}
              alt={current.alt}
              sizes="100vw"
              className={zoomed ? "object-contain scale-150 transition-transform" : "object-contain transition-transform"}
            />
          </div>
          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(active - 1);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white focus-ring hover:bg-white/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(active + 1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white focus-ring hover:bg-white/20"
                aria-label="Next image"
              >
                <ChevronRight className="size-6" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                {active + 1} / {count}
              </span>
            </>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-secondary-text focus-ring"
        >
          <Maximize2 className="size-3.5" /> View fullscreen
        </button>
      )}
    </div>
  );
}

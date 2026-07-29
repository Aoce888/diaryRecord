"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageZoomProps {
  /** Images to display in the gallery */
  images: { url: string; alt?: string }[];
  /** Index of the initially visible image */
  initialIndex?: number;
  /** Render prop for the thumbnail/trigger element */
  children: (onClick: () => void) => React.ReactNode;
  /** CSS class for the trigger element wrapper */
  triggerClassName?: string;
}

export function ImageZoom({ images, initialIndex = 0, children, triggerClassName }: ImageZoomProps) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const openZoom = useCallback(() => setOpen(true), []);
  const closeZoom = useCallback(() => { setOpen(false); setCurrentIndex(initialIndex); }, [initialIndex]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeZoom();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeZoom, goNext, goPrev]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  const showNav = images.length > 1;

  return (
    <>
      {/* Trigger */}
      <div className={triggerClassName} onClick={openZoom}>
        {children(openZoom)}
      </div>

      {/* Lightback */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeZoom}
        >
          {/* Close button */}
          <button
            onClick={closeZoom}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X size={24} />
          </button>

          {/* Image counter */}
          {showNav && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Previous */}
          {showNav && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[currentIndex].url}
              alt={images[currentIndex].alt ?? ""}
              width={1200}
              height={800}
              className="max-h-[85vh] w-auto object-contain"
              priority
              unoptimized
            />
          </div>

          {/* Next */}
          {showNav && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </>
  );
}

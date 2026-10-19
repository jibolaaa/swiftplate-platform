"use client";
// A food photo that quietly falls back to a plain plate if it can't load.
import { useEffect, useRef, useState } from "react";

export default function FoodImage({ src, alt = "", eager = false }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);
  if (failed || !src) return <div className="plate-fallback" aria-hidden={alt ? undefined : "true"} role={alt ? "img" : undefined} aria-label={alt || undefined} />;
  return <img ref={ref} src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} />;
}

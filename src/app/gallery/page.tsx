"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Images, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import type { SavedDesign } from "@/lib/decor";
import { formatPrice } from "@/lib/utils";
import { clearDesigns, deleteDesign, loadDesigns } from "@/lib/gallery";

export default function GalleryPage() {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<SavedDesign | null>(null);

  useEffect(() => {
    setDesigns(loadDesigns());
    setLoaded(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">My Gallery</h1>
        <p className="mt-2 text-stone-600">Loading your saved designs…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            My Gallery
          </h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Designs you saved from the Studio. They live only in this browser —
            clearing your browser data will remove them.
          </p>
        </div>
        {designs.length > 0 && (
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm("Delete all saved designs? This cannot be undone.")) {
                clearDesigns();
                setDesigns([]);
                setSelected(null);
              }
            }}
          >
            <Trash2 aria-hidden /> Clear all
          </Button>
        )}
      </div>

      {designs.length === 0 ? (
        <Card className="mt-8 flex min-h-[320px] flex-col items-center justify-center border-dashed p-8 text-center">
          <Images className="size-10 text-stone-300" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-stone-900">
            No saved designs yet
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
            Redesign a room in the Studio and press “Save to Gallery” — it will
            show up here with its before and after photos.
          </p>
          <Button asChild variant="accent" className="mt-6">
            <Link href="/studio">
              Open the Studio <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => (
            <Card key={design.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setSelected(design)}
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                aria-label={`View ${design.style} ${design.roomType} redesign`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={design.generatedImage}
                  alt={`${design.style} redesign of a ${design.roomType.toLowerCase()}`}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
              </button>
              <CardContent className="p-5">
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{design.style}</Badge>
                  <Badge variant="secondary">{design.roomType}</Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-stone-600">
                  {design.analysis.summary}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-xs text-stone-500">
                    {new Date(design.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {design.analysis.estimatedCostMin !== null &&
                      design.analysis.estimatedCostMax !== null &&
                      ` · Est. ${formatPrice(design.analysis.estimatedCostMin)}–${formatPrice(design.analysis.estimatedCostMax)}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = deleteDesign(design.id);
                      setDesigns(next);
                      if (selected?.id === design.id) setSelected(null);
                    }}
                    aria-label={`Delete ${design.style} ${design.roomType} design`}
                  >
                    <Trash2 aria-hidden /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.style} ${selected.roomType} redesign`}
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  {selected.style} {selected.roomType}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {new Date(selected.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {" · "}
                  {selected.budget}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelected(null)}
                aria-label="Close design view"
              >
                <X aria-hidden />
              </Button>
            </div>
            <div className="mt-4">
              <BeforeAfterSlider
                beforeImage={selected.originalImage}
                afterImage={selected.generatedImage}
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-stone-700">
              {selected.analysis.summary}
            </p>
            {selected.analysis.palette.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.analysis.palette.map((color) => (
                  <span
                    key={color.hex}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700"
                  >
                    <span
                      className="size-4 rounded-full border border-stone-200"
                      style={{ backgroundColor: color.hex }}
                    />
                    {color.name} · {color.hex}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href={selected.generatedImage} download="decorai-redesign.png">
                  Download image
                </a>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const next = deleteDesign(selected.id);
                  setDesigns(next);
                  setSelected(null);
                }}
              >
                <Trash2 aria-hidden /> Delete design
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Download,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import {
  BUDGETS,
  ROOM_TYPES,
  SAMPLE_ROOMS,
  STYLES,
  type Budget,
  type GenerateResult,
  type RoomType,
  type SavedDesign,
  type Style,
} from "@/lib/decor";
import { formatPrice } from "@/lib/utils";
import { saveDesign } from "@/lib/gallery";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

async function urlToDataUrl(url: string): Promise<{ dataUrl: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load the sample photo.");
  const blob = await res.blob();
  const dataUrl = await fileToDataUrl(new File([blob], "sample.jpg", { type: blob.type }));
  return { dataUrl, mimeType: blob.type || "image/jpeg" };
}

function stripDataUrlPrefix(dataUrl: string): string {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : dataUrl;
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-stone-900">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            className={
              value === option
                ? "rounded-full bg-stone-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm"
                : "rounded-full border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 hover:border-stone-400 hover:bg-stone-50"
            }
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function StudioPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [style, setStyle] = useState<Style>("Modern");
  const [roomType, setRoomType] = useState<RoomType>("Living Room");
  const [budget, setBudget] = useState<Budget>("$500–$1,500");
  const [colorPreference, setColorPreference] = useState("");
  const [notes, setNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(false));
  }, []);

  const acceptFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setSaved(false);
    setSaveNote(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That image is over 8 MB — please choose a smaller photo.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setOriginalImage(dataUrl);
      setMimeType(file.type || "image/jpeg");
    } catch {
      setError("Could not read that file. Please try another photo.");
    }
  }, []);

  const loadSample = useCallback(async (id: string, url: string, sampleRoomType: RoomType) => {
    setLoadingSample(id);
    setError(null);
    setResult(null);
    setSaved(false);
    setSaveNote(null);
    try {
      const { dataUrl, mimeType: mt } = await urlToDataUrl(url);
      setOriginalImage(dataUrl);
      setMimeType(mt);
      setRoomType(sampleRoomType);
    } catch {
      setError("Could not load the sample photo. Check your connection and try again.");
    } finally {
      setLoadingSample(null);
    }
  }, []);

  const generate = useCallback(async () => {
    if (!originalImage || generating) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setSaved(false);
    setSaveNote(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: stripDataUrlPrefix(originalImage),
          mimeType,
          style,
          roomType,
          budget,
          colorPreference,
          notes,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      const parsed = data as GenerateResult & { error?: unknown };
      // The API can return the design analysis even when the image failed
      // (HTTP 502 with an analysis): show the plan instead of discarding it.
      if (parsed && typeof parsed === "object" && parsed.analysis) {
        setResult(parsed);
        if (typeof parsed.error === "string" && parsed.error) {
          setError(parsed.error);
        } else if (!res.ok) {
          setError(
            typeof data === "object" && data !== null && "error" in data
              ? String((data as { error: unknown }).error)
              : `Something went wrong (HTTP ${res.status}). Please try again.`,
          );
        } else if (!parsed.generatedImage) {
          setError("The redesign image could not be generated, but the design plan below is ready.");
        }
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        return;
      }
      if (!res.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error: unknown }).error)
            : `Something went wrong (HTTP ${res.status}). Please try again.`;
        setError(message);
        return;
      }
      setError("Gemini returned an incomplete result. Please try again.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  }, [originalImage, generating, mimeType, style, roomType, budget, colorPreference, notes]);

  const handleSave = useCallback(() => {
    if (!result || !originalImage || !result.generatedImage) return;
    const design: SavedDesign = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      style,
      roomType,
      budget,
      colorPreference,
      notes,
      originalImage,
      generatedImage: result.generatedImage,
      analysis: result.analysis,
    };
    const ok = saveDesign(design);
    if (ok) {
      setSaved(true);
      setSaveNote("Saved to your gallery.");
    } else {
      setSaveNote(
        "Could not save — your browser storage may be full. Try deleting older designs in the gallery first.",
      );
    }
  }, [result, originalImage, style, roomType, budget, colorPreference, notes]);

  const copyHex = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex((c) => (c === hex ? null : c)), 1500);
    } catch {
      setCopiedHex(null);
    }
  }, []);

  const analysis = result?.analysis;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
        Studio
      </h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        Upload a photo, pick a style, and Gemini will write the redesign plan
        for your room. The preview image is drawn free — no billing needed —
        and is inspired by your room and the chosen style.
      </p>

      {configured === false && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            <strong>Gemini is not configured yet.</strong> Add your API key to
            the <code className="rounded bg-amber-100 px-1 py-0.5">.env</code> file
            as <code className="rounded bg-amber-100 px-1 py-0.5">GEMINI_API_KEY</code>{" "}
            (get one at Google AI Studio) and restart the dev server. You can
            still explore the Studio, but Generate will not work until then.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* Controls */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your room</CardTitle>
              <CardDescription>
                A clear photo taken from a corner works best.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Upload a photo of your room"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void acceptFile(file);
                  e.target.value = "";
                }}
              />
              <div
                role="button"
                tabIndex={0}
                aria-label="Drop a room photo here, or press Enter to choose a file"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void acceptFile(file);
                }}
                className={
                  dragOver
                    ? "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-600 bg-amber-50 px-4 py-8 text-center"
                    : "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center hover:border-stone-400 hover:bg-stone-100"
                }
              >
                {originalImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={originalImage}
                      alt="Your uploaded room"
                      className="max-h-64 w-full rounded-xl object-cover"
                    />
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-stone-600">
                      <Upload className="size-4" aria-hidden /> Click or drop to replace the photo
                    </span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-8 text-stone-400" aria-hidden />
                    <span className="mt-3 text-sm font-semibold text-stone-800">
                      Drag &amp; drop your room photo here
                    </span>
                    <span className="mt-1 text-xs text-stone-500">
                      or click to browse — JPG, PNG or WebP, under 8 MB
                    </span>
                  </>
                )}
              </div>
              {originalImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOriginalImage(null);
                    setResult(null);
                    setSaved(false);
                    setSaveNote(null);
                  }}
                >
                  <Trash2 aria-hidden /> Remove photo
                </Button>
              )}

              <div>
                <p className="text-sm font-semibold text-stone-900">
                  Or try a sample room
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {SAMPLE_ROOMS.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => void loadSample(room.id, room.image, room.roomType)}
                      disabled={loadingSample !== null}
                      className="group overflow-hidden rounded-xl border border-stone-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-60"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={room.image}
                        alt={room.alt}
                        className="aspect-[4/3] w-full object-cover transition group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="block bg-white px-2 py-1.5 text-xs font-medium text-stone-700">
                        {loadingSample === room.id ? "Loading…" : room.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Design choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ChipGroup label="Style" options={STYLES} value={style} onChange={setStyle} />
              <ChipGroup label="Room type" options={ROOM_TYPES} value={roomType} onChange={setRoomType} />
              <ChipGroup label="Budget" options={BUDGETS} value={budget} onChange={setBudget} />
              <div>
                <label htmlFor="colorPreference" className="text-sm font-semibold text-stone-900">
                  Colour preference
                </label>
                <input
                  id="colorPreference"
                  type="text"
                  value={colorPreference}
                  onChange={(e) => setColorPreference(e.target.value)}
                  placeholder="e.g. warm neutrals with sage green accents"
                  className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
                />
              </div>
              <div>
                <label htmlFor="notes" className="text-sm font-semibold text-stone-900">
                  Anything else?
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Keep the sofa, add plants, make it cosier for evenings"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
                />
              </div>
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                disabled={!originalImage || generating}
                onClick={() => void generate()}
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden /> Redesigning your room…
                  </>
                ) : (
                  <>
                    <Sparkles aria-hidden /> Generate redesign
                  </>
                )}
              </Button>
              {error && (
                <div className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-900" role="alert">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{error}</p>
                </div>
              )}
              {generating && (
                <p className="text-center text-sm text-stone-500" role="status">
                  Gemini is writing your design plan and the free image service
                  is drawing the preview — this usually takes 20–60 seconds.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Result */}
        <div className="lg:col-span-3" ref={resultRef}>
          {!result && !generating && (
            <Card className="flex min-h-[420px] flex-col items-center justify-center border-dashed p-8 text-center">
              <Sparkles className="size-10 text-stone-300" aria-hidden />
              <h2 className="mt-4 text-lg font-semibold text-stone-900">
                Your redesign will appear here
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
                Upload a photo and choose a style, then press Generate. You
                will get a free preview image inspired by your room, a colour
                palette, furniture ideas and a cost estimate.
              </p>
            </Card>
          )}
          {generating && !result && (
            <Card className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
              <Loader2 className="size-10 animate-spin text-amber-700" aria-hidden />
              <h2 className="mt-4 text-lg font-semibold text-stone-900">
                Redesigning your {roomType.toLowerCase()}…
              </h2>
              <p className="mt-2 max-w-sm text-sm text-stone-500">
                Gemini is writing your {style} design plan, and the free
                image service is drawing a preview inspired by your room.
              </p>
            </Card>
          )}
          {result && originalImage && analysis && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{style}</Badge>
                <Badge variant="secondary">{roomType}</Badge>
                <Badge variant="secondary">{budget}</Badge>
                {analysis.estimatedCostMin !== null && analysis.estimatedCostMax !== null && (
                  <Badge variant="accent">
                    Est. {formatPrice(analysis.estimatedCostMin)} –{" "}
                    {formatPrice(analysis.estimatedCostMax)}
                  </Badge>
                )}
                {result.imageEngine === "pollinations" && (
                  <Badge variant="secondary">Free preview image</Badge>
                )}
                {result.imageEngine === "gemini" && (
                  <Badge variant="secondary">Gemini image</Badge>
                )}
              </div>

              {result.imageNote && (
                <p className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-600" role="note">
                  {result.imageNote}
                </p>
              )}

              {result.generatedImage ? (
                <>
                  <BeforeAfterSlider beforeImage={originalImage} afterImage={result.generatedImage} />
                  <p className="text-center text-xs text-stone-500">
                    Drag the handle to compare your room before and after.
                  </p>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={originalImage}
                      alt="Your original room"
                      className="max-h-96 w-full rounded-xl object-cover"
                    />
                    <p className="mt-3 text-sm text-stone-600">
                      No preview image this time — the free image service
                      couldn&apos;t draw one. Your original photo is above,
                      and the full design plan is below. Try generating again
                      in a minute.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="accent"
                  onClick={handleSave}
                  disabled={saved || !result.generatedImage}
                  title={
                    result.generatedImage
                      ? undefined
                      : "Nothing to save yet — there is no preview image for this design."
                  }
                >
                  {saved ? (
                    <>
                      <Check aria-hidden /> Saved to gallery
                    </>
                  ) : (
                    <>
                      <Save aria-hidden /> Save to Gallery
                    </>
                  )}
                </Button>
                {result.generatedImage && (
                  <Button asChild variant="outline">
                    <a href={result.generatedImage} download="decorai-redesign.png">
                      <Download aria-hidden /> Download image
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setSaved(false);
                    setSaveNote(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <RefreshCw aria-hidden /> Try another style
                </Button>
              </div>
              {saveNote && (
                <p className="text-sm text-stone-600" role="status">
                  {saveNote}{" "}
                  {saved && (
                    <Link href="/gallery" className="font-semibold text-amber-800 underline">
                      View gallery
                    </Link>
                  )}
                </p>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>What changed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-stone-700">{analysis.summary}</p>
                </CardContent>
              </Card>

              {analysis.palette.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Colour palette</CardTitle>
                    <CardDescription>Click a swatch to copy its hex code.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {analysis.palette.map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => void copyHex(color.hex)}
                          className="overflow-hidden rounded-xl border border-stone-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                          aria-label={`Copy hex code ${color.hex} for ${color.name}`}
                        >
                          <span
                            className="block h-14 w-full"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="block bg-white px-3 py-2">
                            <span className="block text-sm font-semibold text-stone-900">
                              {color.name}
                            </span>
                            <span className="block text-xs text-stone-500">
                              {copiedHex === color.hex ? "Copied!" : color.hex}
                              {color.role ? ` · ${color.role}` : ""}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {analysis.furniture.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Furniture &amp; decor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y divide-stone-100">
                      {analysis.furniture.map((item) => (
                        <li key={item.item} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                          <div>
                            <p className="text-sm font-semibold text-stone-900">{item.item}</p>
                            {item.why && (
                              <p className="mt-0.5 text-sm text-stone-600">{item.why}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-stone-900">
                            {formatPrice(item.estPrice)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {analysis.tips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tips to make it work</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
                      {analysis.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

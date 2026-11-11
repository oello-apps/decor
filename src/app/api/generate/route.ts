import { NextResponse } from "next/server";
import type { DesignAnalysis } from "@/lib/decor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const GEMINI_HOST = "https://generativelanguage.googleapis.com";
const POLLINATIONS_HOST = "https://image.pollinations.ai";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const POLLINATIONS_NOTE =
  "Free preview image: inspired by your room and the chosen style, not an exact edit of your photo. It may carry a small watermark.";

type EngineMode = "auto" | "gemini" | "pollinations";

interface GenerateBody {
  imageBase64?: unknown;
  mimeType?: unknown;
  style?: unknown;
  roomType?: unknown;
  budget?: unknown;
  colorPreference?: unknown;
  notes?: unknown;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string; status?: string };
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function stripDataUrlPrefix(value: string): string {
  const match = value.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : value;
}

function approxBytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

function engineMode(): EngineMode {
  const raw = (process.env.IMAGE_ENGINE || "auto").trim().toLowerCase();
  if (raw === "gemini" || raw === "pollinations") return raw;
  return "auto";
}

async function callGemini(
  model: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: GeminiResponse }> {
  const res = await fetch(
    `${GEMINI_HOST}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    },
  );
  let data: GeminiResponse = {};
  try {
    data = (await res.json()) as GeminiResponse;
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

function geminiErrorMessage(status: number, data: GeminiResponse): string {
  const detail = data.error?.message?.trim();
  if (status === 401 || status === 403) {
    return "Gemini rejected the API key. Check that GEMINI_API_KEY is correct and that the Gemini API is enabled for that key.";
  }
  if (status === 404) {
    return "That Gemini model is no longer available for this key. Update GEMINI_TEXT_MODEL to gemini-3.5-flash and GEMINI_IMAGE_MODEL to gemini-2.5-flash-image.";
  }
  if (status === 429) {
    return "Gemini quota exceeded (429). Image models have no free-tier quota on this key — enable billing on the Google Cloud project for this API key in Google AI Studio, then try again. If this was a text-model limit, wait a minute and retry.";
  }
  if (status === 400) {
    return detail
      ? `Gemini could not process this request: ${detail}`
      : "Gemini could not process this request. Try a different photo or a shorter note.";
  }
  return detail
    ? `Gemini returned an error (${status}): ${detail}`
    : `Gemini returned an error (HTTP ${status}). Please try again.`;
}

function extractText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? "")
    .join("\n")
    .trim();
}

function extractImage(data: GeminiResponse): { data: string; mimeType: string } | null {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType ?? "image/png",
      };
    }
  }
  return null;
}

function fallbackAnalysis(summary: string): DesignAnalysis {
  return {
    summary,
    palette: [],
    furniture: [],
    tips: [],
    estimatedCostMin: null,
    estimatedCostMax: null,
    estimatedCostCurrency: "USD",
  };
}

function parseAnalysis(raw: string): {
  analysis: DesignAnalysis;
  imagePrompt: string | null;
} {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const fallback = fallbackAnalysis(
    raw || "Gemini redesigned your room — see the image for the new look.",
  );
  if (!cleaned) return { analysis: fallback, imagePrompt: null };
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null) {
      return { analysis: fallback, imagePrompt: null };
    }
    const p = parsed as Record<string, unknown>;
    const palette = Array.isArray(p.palette)
      ? (p.palette as Array<Record<string, unknown>>)
          .filter((c) => typeof c?.name === "string" && typeof c?.hex === "string")
          .map((c) => ({
            name: String(c.name),
            hex: String(c.hex),
            role: typeof c.role === "string" ? c.role : "",
          }))
      : [];
    const furniture = Array.isArray(p.furniture)
      ? (p.furniture as Array<Record<string, unknown>>)
          .filter((f) => typeof f?.item === "string")
          .map((f) => ({
            item: String(f.item),
            why: typeof f.why === "string" ? f.why : "",
            estPrice:
              typeof f.estPrice === "number" && Number.isFinite(f.estPrice)
                ? f.estPrice
                : null,
          }))
      : [];
    const tips = Array.isArray(p.tips)
      ? (p.tips as unknown[]).filter((t): t is string => typeof t === "string")
      : [];
    const analysis: DesignAnalysis = {
      summary:
        typeof p.summary === "string" && p.summary
          ? p.summary
          : fallback.summary,
      palette,
      furniture,
      tips,
      estimatedCostMin:
        typeof p.estimatedCostMin === "number" ? p.estimatedCostMin : null,
      estimatedCostMax:
        typeof p.estimatedCostMax === "number" ? p.estimatedCostMax : null,
      estimatedCostCurrency:
        typeof p.estimatedCostCurrency === "string"
          ? p.estimatedCostCurrency
          : "USD",
    };
    const imagePrompt =
      typeof p.imagePrompt === "string" && p.imagePrompt.trim()
        ? p.imagePrompt.trim()
        : null;
    return { analysis, imagePrompt };
  } catch {
    return { analysis: fallback, imagePrompt: null };
  }
}

/**
 * Free image generation via Pollinations (anonymous, no key).
 * Text-to-image only: the kontext image-to-image endpoint is NOT part of
 * the free Classic API and returns 403, so the prompt alone is sent and
 * the result is an inspired preview, not an edit of the uploaded photo.
 * Verified 2026-11-11: model=flux serves Sana, returns 200 JPEG.
 */
async function callPollinations(
  prompt: string,
): Promise<
  | { ok: true; dataUrl: string }
  | { ok: false; status: number; message: string }
> {
  const model = process.env.POLLINATIONS_MODEL || "flux";
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const url =
    `${POLLINATIONS_HOST}/prompt/${encodeURIComponent(prompt)}` +
    `?model=${encodeURIComponent(model)}&width=1024&height=1024&nologo=true&seed=${seed}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  } catch {
    return {
      ok: false,
      status: 502,
      message:
        "The free image service could not be reached. Check your connection and try again.",
    };
  }
  if (!res.ok) {
    if (res.status === 402 || res.status === 429 || res.status === 403) {
      return {
        ok: false,
        status: res.status,
        message:
          "The free image service is rate-limited right now. Wait about a minute and retry.",
      };
    }
    return {
      ok: false,
      status: res.status,
      message: `The free image service returned an error (HTTP ${res.status}). Please try again.`,
    };
  }
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return {
      ok: false,
      status: 502,
      message:
        "The free image service did not return an image. Please try again.",
    };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) {
    return {
      ok: false,
      status: 502,
      message:
        "The free image service returned an empty image. Please try again.",
    };
  }
  const mime = contentType.split(";")[0].trim() || "image/jpeg";
  return { ok: true, dataUrl: `data:${mime};base64,${buf.toString("base64")}` };
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonError(
      "GEMINI_API_KEY is not configured — add it to .env",
      400,
    );
  }

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (typeof body.imageBase64 !== "string" || !body.imageBase64.trim()) {
    return jsonError("An image is required. Upload a photo of your room first.", 400);
  }
  const imageBase64 = stripDataUrlPrefix(body.imageBase64.trim());
  if (approxBytes(imageBase64) > MAX_IMAGE_BYTES) {
    return jsonError("That image is too large — please use a photo under 8 MB.", 400);
  }
  const mimeType =
    typeof body.mimeType === "string" && body.mimeType.startsWith("image/")
      ? body.mimeType
      : "image/jpeg";
  const style = typeof body.style === "string" && body.style ? body.style : "Modern";
  const roomType =
    typeof body.roomType === "string" && body.roomType ? body.roomType : "Living Room";
  const budget =
    typeof body.budget === "string" && body.budget ? body.budget : "$500–$1,500";
  const colorPreference =
    typeof body.colorPreference === "string" ? body.colorPreference.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  const imageModel =
    process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  // Verified 2026-11-11 with Thomas's key: gemini-2.5-flash returns 404
  // ("no longer available to new users") — gemini-3.5-flash works on the
  // free tier. Image models return 429 with limit 0 on the free tier and
  // need billing enabled on the Google Cloud project for the key.
  const textModel = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";
  const mode = engineMode();

  // 1. Design plan + image prompt from the Gemini text model (free tier).
  const analysisPrompt = [
    `You are an interior designer. A homeowner wants their ${roomType.toLowerCase()} redesigned in a ${style} style, budget ${budget}.`,
    colorPreference ? `Colour preference: ${colorPreference}.` : "",
    notes ? `Homeowner notes: ${notes}` : "",
    "Look at the attached photo of their current room and reply with STRICT JSON ONLY — no markdown fences, no extra text — using exactly this shape:",
    '{"summary": "2-3 sentences describing the redesign and what changes most", "palette": [{"name": "Warm White", "hex": "#F5F0E8", "role": "Walls"}], "furniture": [{"item": "Linen slipcover sofa", "why": "Softens the room and suits the style", "estPrice": 650}], "tips": ["One practical tip per item, 3-5 tips"], "estimatedCostMin": 800, "estimatedCostMax": 1400, "estimatedCostCurrency": "USD", "imagePrompt": "A detailed photorealistic prompt, 1-3 sentences, describing the redesigned room: layout, furniture placement, colours, materials, lighting and camera angle, in the chosen style"}',
    "Give 4-6 palette colours with valid hex codes, 4-7 furniture or decor items with realistic USD prices that fit the budget, and a cost range that matches the items.",
  ]
    .filter(Boolean)
    .join("\n");

  const textCall = await callGemini(textModel, apiKey, {
    contents: [
      {
        parts: [
          { text: analysisPrompt },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  });

  // A prompt built from the request alone, used when the text model did
  // not return an imagePrompt (or its call failed transiently).
  const synthesizedPrompt = [
    `Photorealistic interior photograph of a ${roomType.toLowerCase()} redesigned in a ${style} style,`,
    "same room layout and camera angle, natural light, correct perspective and proportions, no text or watermarks.",
    `Budget level: ${budget}.`,
    colorPreference ? `Colour preference: ${colorPreference}.` : "",
    notes ? `Homeowner notes: ${notes}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  let analysis: DesignAnalysis;
  let imagePrompt: string;
  if (textCall.ok) {
    const parsed = parseAnalysis(extractText(textCall.data));
    analysis = parsed.analysis;
    imagePrompt = parsed.imagePrompt ?? synthesizedPrompt;
  } else if (textCall.status === 429 || textCall.status === 503) {
    // Transient text failure: still try for a free preview image with a
    // synthesized prompt, and return a fallback analysis with it.
    analysis = fallbackAnalysis(
      "Your redesign image is below. The written breakdown could not be generated this time, so try regenerating for the palette and furniture ideas.",
    );
    imagePrompt = synthesizedPrompt;
  } else {
    return jsonError(
      geminiErrorMessage(textCall.status, textCall.data),
      textCall.status === 400 ? 502 : textCall.status,
    );
  }

  // 2. The redesigned image: Gemini first (auto/gemini), Pollinations free
  // fallback (auto) or on its own (pollinations).
  const geminiImagePrompt = [
    `Redesign this ${roomType.toLowerCase()} in a ${style} interior design style.`,
    "Keep the exact same room layout, architecture, windows, doors and camera angle — only change the decor, furniture, colours, materials, lighting and styling.",
    `Budget level: ${budget}. Choose furniture and finishes that fit that budget.`,
    colorPreference ? `Colour preference: ${colorPreference}.` : "",
    notes ? `Homeowner notes: ${notes}` : "",
    "Make the result look like a realistic, professionally photographed interior — natural light, correct perspective and proportions, no text or watermarks.",
  ]
    .filter(Boolean)
    .join(" ");

  const tryPollinations = async (): Promise<
    | {
        ok: true;
        generatedImage: string;
        imageEngine: "pollinations";
        imageNote: string;
      }
    | {
        ok: false;
        generatedImage: null;
        imageEngine: null;
        imageNote: string;
        error: string;
      }
  > => {
    const result = await callPollinations(imagePrompt);
    if (result.ok) {
      return {
        ok: true,
        generatedImage: result.dataUrl,
        imageEngine: "pollinations",
        imageNote: POLLINATIONS_NOTE,
      };
    }
    return {
      ok: false,
      generatedImage: null,
      imageEngine: null,
      imageNote: POLLINATIONS_NOTE,
      error: result.message,
    };
  };

  if (mode === "pollinations") {
    const outcome = await tryPollinations();
    if (outcome.ok) {
      return NextResponse.json({
        generatedImage: outcome.generatedImage,
        analysis,
        imageEngine: outcome.imageEngine,
        imageNote: outcome.imageNote,
      });
    }
    // Analysis succeeded but the image did not: return it anyway, with the
    // error, so the UI can show the plan instead of failing the request.
    return NextResponse.json(
      {
        generatedImage: null,
        analysis,
        imageEngine: null,
        imageNote: outcome.imageNote,
        error: outcome.error,
      },
      { status: 502 },
    );
  }

  const imageCall = await callGemini(imageModel, apiKey, {
    contents: [
      {
        parts: [
          { text: geminiImagePrompt },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  });

  if (imageCall.ok) {
    const generated = extractImage(imageCall.data);
    if (generated) {
      return NextResponse.json({
        generatedImage: `data:${generated.mimeType};base64,${generated.data}`,
        analysis,
        imageEngine: "gemini" as const,
      });
    }
    if (mode === "gemini") {
      const modelText = extractText(imageCall.data);
      return jsonError(
        modelText
          ? `Gemini did not return an image: ${modelText.slice(0, 300)}`
          : "Gemini did not return an image for this photo. Try a clearer photo of the room.",
        502,
      );
    }
    // Gemini answered but gave no image: fall through to the free preview.
  } else if (mode === "gemini") {
    return jsonError(
      geminiErrorMessage(imageCall.status, imageCall.data),
      imageCall.status === 400 ? 502 : imageCall.status,
    );
  } else if (imageCall.status !== 429 && imageCall.status !== 404) {
    // Auto mode only falls back on 429/404; other Gemini image errors are
    // returned as before.
    return jsonError(
      geminiErrorMessage(imageCall.status, imageCall.data),
      imageCall.status === 400 ? 502 : imageCall.status,
    );
  }

  // Auto mode, Gemini image unavailable (429 quota 0 on the free tier, or
  // 404, or no image returned): free Pollinations preview instead.
  const outcome = await tryPollinations();
  if (outcome.ok) {
    return NextResponse.json({
      generatedImage: outcome.generatedImage,
      analysis,
      imageEngine: outcome.imageEngine,
      imageNote: outcome.imageNote,
    });
  }
  return NextResponse.json(
    {
      generatedImage: null,
      analysis,
      imageEngine: null,
      imageNote: outcome.imageNote,
      error: outcome.error,
    },
    { status: 502 },
  );
}

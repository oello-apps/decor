# DecorAI — AI Interior Decoration

Upload a photo of your room, pick a style, and let Google Gemini redesign it.
You get a redesigned image (before / after slider), a colour palette,
furniture ideas with estimated prices, practical tips and a cost range.
Designs you save live in your browser's local storage — no account, no
database in v1.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn-style UI
- Gemini via direct `fetch` to the Generative Language API — no AI SDK dependency
  - Image model (default): `gemini-2.5-flash-image`
  - Text model (default): `gemini-3.5-flash` (verified working on the free tier 2026-11-11; `gemini-2.5-flash` returns 404 for new users)
- No auth, no database in v1 (saved designs use `localStorage` key `decorai-designs`)

## Pages

| Route | What it does |
| --- | --- |
| `/` | Hero, how it works, style showcase, sample before/after |
| `/studio` | Upload / drag-drop / sample rooms, style + room + budget picker, Generate, before/after slider, palette, furniture, tips, Save to Gallery, Download |
| `/gallery` | Saved designs from localStorage, view modal with before/after, delete one / clear all |
| `GET /api/status` | `{ configured: boolean }` — never returns the key |
| `POST /api/generate` | `{ imageBase64, mimeType, style, roomType, budget, colorPreference, notes }` → `{ generatedImage, analysis, imageEngine, imageNote? }` |

## Setup

```bash
cd interior-app
npm install
cp .env.example .env
# Edit .env and set GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000 and go to the Studio.

### Get a Gemini API key

1. Go to Google AI Studio: https://aistudio.google.com/app/apikey
2. Create an API key (a Google Cloud project is created for you if needed).
3. Paste it into `.env` as `GEMINI_API_KEY=...` — server-only, never put it in
   client-side code and never commit `.env`.

Without a key, `/api/status` reports `configured: false`, the Studio shows a
warning banner, and `POST /api/generate` returns HTTP 400 with
`GEMINI_API_KEY is not configured — add it to .env`.

## Free mode (no billing)

Gemini image models have no free-tier quota — every one tested on
2026-11-11 returns HTTP 429 with limit 0 — so DecorAI runs in free mode
by default (`IMAGE_ENGINE=auto`):

1. **Gemini text model first** — `gemini-3.5-flash` (free tier) looks at
   the uploaded photo and returns strict JSON with the design plan
   (`summary`, `palette`, `furniture`, `tips`, cost range) plus an
   `imagePrompt`: a detailed photorealistic prompt describing the
   redesigned room.
2. **Gemini image model next** — the photo plus a layout-preserving prompt
   is sent to `gemini-2.5-flash-image` (`responseModalities: ["TEXT",
   "IMAGE"]`). If it succeeds, that exact edit of the photo is used.
3. **Free fallback** — if Gemini images fail with 429 or 404, the server
   calls Pollinations text-to-image (anonymous, no key) with the
   `imagePrompt`:
   `GET https://image.pollinations.ai/prompt/{prompt}?model=flux&width=1024&height=1024&nologo=true&seed={random}`
   and returns the JPEG as a data URL.

The Pollinations preview is inspired by the room and the chosen style —
it is **not** an exact edit of the uploaded photo, because Pollinations'
image-to-image endpoint (`kontext`, `?image=`) is not part of the free
Classic API and returns HTTP 403 `kontext isn't part of the Classic API.
Use it with a pollen key` (verified 2026-11-11). Do not use `kontext` or
`?image=` without a paid Pollinations key. The models list returns only
`["sana"]`, so `model=flux` is served by Sana, and the output carries a
small `pollinations.ai` watermark bottom-right even with `nologo=true` on
the anonymous tier. The API response marks this with
`imageEngine: "pollinations"` and an `imageNote` saying so; the Studio
shows both.

Set `IMAGE_ENGINE=gemini` to restore Gemini-only behaviour once billing
is enabled on the Google Cloud project for the key, or
`IMAGE_ENGINE=pollinations` to skip Gemini images entirely.

## How the Gemini calls work

`src/app/api/generate/route.ts` makes direct `fetch` calls to
`https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
with the header `x-goog-api-key: $GEMINI_API_KEY` (not a `?key=` query param):

1. **Text model** — the original photo plus a prompt asking for strict JSON
   only (`responseMimeType: "application/json"`):
   `{ summary, palette: [{name, hex, role}], furniture: [{item, why, estPrice}], tips, estimatedCostMin, estimatedCostMax, estimatedCostCurrency, imagePrompt }`.
   The JSON is parsed robustly (markdown fences stripped); if parsing fails
   the raw text is returned as the summary.
2. **Image model** — the original photo (`inlineData`) plus a prompt to keep
   the room's layout, architecture and camera angle and restyle it in the
   chosen style / budget / colours. `responseModalities: ["TEXT", "IMAGE"]`.
   The returned `inlineData` image is sent back as a data URL.

`POST /api/generate` returns
`{ generatedImage, analysis, imageEngine, imageNote? }` where
`imageEngine` is `"gemini"`, `"pollinations"` or `null`, and
`generatedImage` is a data URL or `null` when no image could be made.

Error handling: a missing key is HTTP 400; Gemini 401/403 (bad key) and 429
(rate limit) are passed through with a plain-English message and are not
retried. If the image step fails after the analysis succeeded, the API
returns the analysis with `generatedImage: null` and an `error` field
(HTTP 502) instead of failing the whole request, and the Studio shows the
plan with a message about the missing image.

## Deploy to Vercel

```bash
npm run build
```

Then import the repo in Vercel (or `vercel` from the CLI) and set these
environment variables in the project settings:

- `GEMINI_API_KEY` — required
- `GEMINI_IMAGE_MODEL` — optional, defaults to `gemini-2.5-flash-image`
- `GEMINI_TEXT_MODEL` — optional, defaults to `gemini-3.5-flash`
- `IMAGE_ENGINE` — optional, `auto` (default), `gemini` or `pollinations`
- `POLLINATIONS_MODEL` — optional, defaults to `flux`

> Image generation needs billing: image models (`gemini-2.5-flash-image`, `gemini-3.1-flash-image`) return HTTP 429 with free-tier quota 0 on a key without billing. Enable billing on the Google Cloud project for the key in Google AI Studio, then image redesigns work. The text breakdown (`gemini-3.5-flash`) works on the free tier.

No database or other service is needed for v1. Note that Gemini usage is
billed / rate-limited per your Google AI Studio account and key.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint

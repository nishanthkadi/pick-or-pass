# Pick or Pass — App

Pick or pass on used toy listings before you drive. Text and photo check for Facebook Marketplace.

## Setup

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# Add GEMINI_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run eval` | Run eval suite (live API) |
| `npm run eval -- --score-only` | Score golden outputs without API |
| `npm run eval -- --no-sync` | Live eval, skip demo JSON sync |

## Folder map

| Path | Purpose |
| --- | --- |
| `src/lib/prompts/` | System prompt |
| `src/lib/schema/` | Zod validation schema |
| `src/lib/gemini/` | Gemini API client |
| `src/lib/eval/` | Eval loader + rubric scorer |
| `../eval/dataset.jsonl` | Eval source of truth |
| `../eval/golden/` | Reference outputs |
| `src/data/demos/` | Cached sample analyses |
| `public/listings/` | Sample listing images |
| `src/app/api/analyze/` | Live analysis + BYOK |
| `src/app/api/demo/[id]/` | Cached demo API |

PM docs live in the parent folder: `../`

## Deploy (Vercel)

1. Push the repo to GitHub (app lives in `app/` — set **Root Directory** to `app` in Vercel, or deploy from `app/`).
2. Import project in [Vercel](https://vercel.com/new).
3. **Environment variables** (Production + Preview):
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey)
   - `GEMINI_MODEL` — optional, defaults to `gemini-2.5-flash-lite`
4. Deploy. Smoke-test:
   - Home → Sample listings → open Listing 1–6 (no API key needed)
   - Analyze your own listing (uses server key + rate limits)
5. **Rate limits:** In-memory on Hobby tier (resets on cold start). BYOK path lets users bring their own key after free checks.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Gemini API (multimodal)
- Vercel (deploy)

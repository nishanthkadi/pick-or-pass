# Pick or Pass — App

**Live:** https://pick-or-pass-seven.vercel.app/

Pick or pass on used toy listings before you drive. Text and photo check for Facebook Marketplace.

## Setup

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# Add GEMINI_API_KEY to .env.local
# Ensure src/lib/prompts/system.private.txt exists (local), then:
#   npm run sync-prompt   # upserts prompt to Supabase for Vercel
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
| `npm run sync-prompt` | Upsert `system.private.txt` → Supabase `app_config` |
| `npm run sync-demos` | Upsert sample listings → Supabase `demo_listings` + Storage |
| `npm run review-feedback` | Review / promote consented feedback into eval |

## Folder map

| Path | Purpose |
| --- | --- |
| `src/lib/prompts/` | Prompt loader (`system.ts`); full prompt in private file + Supabase |
| `src/lib/schema/` | Zod validation schema |
| `src/lib/gemini/` | Gemini API client |
| `src/lib/eval/` | Eval loader + rubric scorer |
| `../eval/dataset.jsonl` | Full private eval set (gitignored) |
| `../eval/dataset.example.jsonl` | Public 2-case example |
| `../eval/golden/` | Reference outputs (listing-1/2 public) |
| `src/data/demos/` | Cached sample analyses (listing-1/2 public) |
| `public/listings/` | Sample listing images (listing-1/2 public) |
| `src/app/api/analyze/` | Live analysis + BYOK |
| `src/app/api/demo/[id]` | Cached demo API |
| `src/app/api/saved-listings/` | Save listing text/photos/verdicts |
| `src/app/api/feedback/` | Store feedback tied to saved listings when available |

PM docs live in the parent folder: `../` — see also [`../PRIVATE_EVAL.md`](../PRIVATE_EVAL.md).

## Deploy (Vercel)

1. Push the repo to GitHub (app lives in `app/` — set **Root Directory** to `app` in Vercel, or deploy from `app/`).
2. Import project in [Vercel](https://vercel.com/new).
3. **Environment variables** (Production + Preview):
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey)
   - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — required for saved listings **and** loading the system prompt
   - `SYSTEM_PROMPT` — optional fallback only; prefer `npm run sync-prompt` → Supabase
   - `GEMINI_MODEL` — optional, defaults to `gemini-flash-latest`
   - `SUPABASE_SAVED_LISTINGS_BUCKET` — optional, defaults to `saved-listing-photos`
4. Run `supabase/app_config.sql` and `supabase/demos.sql` once, then from `app/`:
   - `npm run sync-prompt`
   - `npm run sync-demos`
5. Deploy. Smoke-test:
   - Home → Sample listings → open any synced sample (no API key needed)
   - Analyze your own listing (uses server key + rate limits; loads prompt from Supabase)
   - Save a listing and submit feedback after Supabase is configured
6. **Rate limits:** In-memory on Hobby tier (resets on cold start). BYOK path lets users bring their own key after free checks.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Gemini API (multimodal)
- Supabase Postgres + Storage (saved listings, photos, feedback)
- Vercel (deploy)

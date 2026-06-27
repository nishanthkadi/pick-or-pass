# Build Notes — Marketplace Toy Check

## Build Plan (v1)

Teaching-oriented plan. Each phase has a **why** before the **what**.

---

### Phase 0 — Setup (30 min)

**What:** Repo in `app/`, env vars, choose stack.

**Why:** API keys must never live in frontend code. Establishing this habit early prevents the most common AI app mistake.

**Decisions:**

| Decision | Choice | Why |
| --- | --- | --- |
| Stack | Next.js (App Router) | One repo: UI + API route. Easy Vercel deploy. Strong portfolio demo. |
| Hosting | Vercel (Hobby / free tier) | Matches Next.js; deploy from GitHub; env vars for secrets |
| Model | **Google Gemini** (Flash — multimodal) | Free tier via Google AI Studio; text + image; $0 target for demos |
| Inference cost | $0 — rate limits on `/api/analyze` | Public demo without runaway API spend |
| Database | None (v1) | No user history per scope. Less to build and break. |
| Styling | Tailwind (minimal) | Fast enough; not the learning focus. |

**Learn:** Where secrets live (`.env.local`), client vs server boundary in Next.js.

**Done when:** Empty app runs locally; `.env.local` has `GEMINI_API_KEY`; `.env.local` is in `.gitignore`.

---

## Hosting and inference (locked)

**Goal:** Anyone can try the live demo; **$0 spend** from you.

**Stack:**

```text
GitHub (code) → Vercel (app) → Gemini API (multimodal inference)
```

**Env vars:**

| Variable | Where | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | `.env.local` / Vercel dashboard | Server-side only; never exposed to browser |

**Rate limits (implement in Phase 2 — non-optional):**

| Limit | Suggested v1 value | Why |
| --- | --- | --- |
| Per IP | 3 requests / hour | Stops one user from burning quota |
| Global daily cap | 20 analyses / day | Hard ceiling on your free tier usage |
| Max text length | 4,000 characters | Listing paste only; blocks abuse payloads |
| Max photos | 5 images | Matches product spec |
| Max image size | 4 MB each | Keeps requests fast and cheap |

**When daily cap hit:** Return HTTP 429 with message + show **BYOK** option (user's Gemini key).

**Three inference paths (v1):**

| Path | Trigger | Cost to you |
| --- | --- | --- |
| **Cached demo** | User clicks example card (default UX) | $0 |
| **Live analyze** | User pastes own listing | Free tier, rate limited |
| **BYOK** | Limit hit or user opts in | $0 — user pays Gemini |

**Cached demos:**

- Pre-generated JSON for Listing 1 (Good) and Listing 2 (Not sure)
- Served from `app/data/demos/` via `/api/demo/[id]`
- **Default landing UX** — visitors try examples before live analyze
- Built during Phase 1 (save good prompt output once)

**BYOK rules:**

- User key in POST body only; never stored or logged
- Skips rate limit; user pays inference
- Same Zod validation and prompt as server-key path

**Risks to monitor:**

- Free tier quotas change — check [Google AI pricing](https://ai.google.dev/pricing) before launch
- Public URL + your key = must have server-side rate limits on non-BYOK path
- Rate limiting on serverless needs shared store (e.g. Upstash free tier) — not in-memory only

**GitHub:** Push `app/` + link live Vercel URL in README. HF optional later.

---

### Phase 1 — Prompt lab, no UI (1–2 hours) ← most important phase

**What:** Call the model from `npm run eval` using cases in `../eval/dataset.jsonl`.

**Eval layout (medium):**

```text
eval/
  dataset.jsonl     ← source of truth
  golden/           ← reference outputs
  results/          ← run logs (gitignored)
assets/             ← images referenced by dataset
```

**Why:** In AI products, **prompt + schema quality IS the product** in v1. Building UI first hides bad outputs behind buttons and wastes time.

**Steps:**

1. Write system prompt encoding guardrails from `02_Scope_and_Tradeoffs.md`.
2. Send text + image(s) as multimodal user message.
3. Request JSON matching schema in `03_Product_Spec.md`.
4. Compare output to expected grades for both Peppa listings.
5. Iterate until Listing 1 → Good, Listing 2 → Not sure.

**Learn:**

- Multimodal message structure (how images attach to API calls)
- System vs user prompt roles
- Why structured JSON beats free-form prose (evals, UI rendering, consistency)
- Guardrails in system prompt vs post-processing

**Done when:** 2/2 seed examples produce acceptable grades and sections on 3 consecutive runs.

---

### Phase 2 — API route + schema validation (1–2 hours)

**What:** Server routes: `GET /api/demo/[id]` (cached) and `POST /api/analyze` (live + BYOK).

**Why:**

- **Server-side calls** keep API key secret and let you swap models without redeploying UI.
- **Schema validation** (Zod) catches model drift — models sometimes break JSON shape.
- **Cached demo route** serves $0 examples without touching Gemini.
- **BYOK path** lets users continue after rate limit without cost to you.

**Steps:**

1. Create `/api/demo/[id]` — return static JSON for cruise-ship and minimal-listing.
2. Create `/api/analyze` route.
3. Accept multipart form or base64 images + text + optional `apiKey`.
4. Rate limit only when using server `GEMINI_API_KEY`.
5. Call model with system prompt from Phase 1.
6. Parse response with Zod schema matching product spec JSON.
7. Return 400 if inputs missing; 422 if model output invalid; 429 if rate limited.

**Learn:**

- Request/response contract between UI and AI
- Three-path inference design (cached / server key / BYOK)
- Defensive parsing (never trust raw model output)
- Rate limiting on serverless (Upstash or similar)

**Done when:** `curl` or Postman can analyze a listing without UI.

---

### Phase 3 — Minimal UI (2–3 hours)

**What:** Single page — **cached demo cards first**, then paste text + upload photos, Analyze, BYOK fallback, render 6 sections.

**Why:** UI is a **renderer** for structured output, not the brain. Demo-first protects your free tier.

**Steps:**

1. Demo cards: "Try cruise ship (Good)" / "Try minimal listing (Not sure)" — instant cached results.
2. Custom form: text area + file input (min 1 photo).
3. Disable Analyze until both present (hard block from spec).
4. On 429: show BYOK field + link back to cached demos.
5. Loading state: "Checking if this trip is worth it…"
6. Render grade hero (green / amber / red).
7. Render sections in spec order (same renderer for cached + live).

**Learn:**

- Form validation as product rule enforcement
- Mapping JSON → UI components
- Why grade colors help scannability

**Done when:** You can paste Listing 2 text, upload photo, get Not sure with all 6 sections.

---

### Phase 4 — Eval loop (2–3 hours)

**What:** Build 10+ labeled examples (start with 2 seed + 8 you collect from Marketplace). Script or manual checklist to score runs.

**Why:** This is the **AI PM skill** you're upskilling for. Without evals you're guessing like ChatGPT users.

**Steps:**

1. Add rows to `Eval_Seed_Examples.md` (or `eval/listings.json`).
2. For each: text, photo ref, expected grade, must-have reasons.
3. Run all through `/api/analyze`.
4. Score: grade match? guardrails respected? sections present?
5. Log failures in build notes; fix prompt; rerun.

**Learn:**

- Eval sets as regression tests for non-deterministic systems
- Prompt iteration driven by failure cases, not vibes
- Foundation for v1.5 feedback loop and v3 automated research

**Done when:** ≥80% grade agreement on 10 examples (strict on Good vs Not sure vs Avoid).

---

### Phase 5 — Deploy + portfolio package (1–2 hours)

**What:** Deploy to Vercel; screenshot demo; update portfolio files.

**Why:** Portfolio signal requires something others can try. Deployment is part of AI product literacy (env vars, limits, cost).

**Steps:**

1. Deploy Next.js app.
2. Set env vars in Vercel dashboard.
3. Capture screenshots for `assets/`.
4. Draft case study in `portfolio/`.
5. Write retrospective in `06_Retrospective.md`.

**Learn:** Production env management, cold start / latency, API cost per analysis.

**Done when:** Live URL works; 3 screenshots; retrospective written.

---

## What we are NOT building in v1 (and why)

| Skip | Why |
| --- | --- |
| Web research / tools | Agent complexity; eval debt; you chose defer to v3 |
| User accounts | Out of scope; adds auth + storage for no v1 learning gain |
| Streaming | Output is structured JSON batch; streaming adds UI complexity |
| Fine-tuning | Prompt + schema is the lever at this stage |
| Extension | Validated paste workflow first; extension is v2 distribution |

---

## Suggested build order (visual)

```text
Prompt lab (Phase 1) → save cached demo JSON
    ↓
API routes: /api/demo + /api/analyze + BYOK (Phase 2)
    ↓
UI: demos first, then custom analyze (Phase 3)
    ↓
Eval loop (Phase 4)
    ↓
Deploy (Phase 5)
```

**Anti-pattern:** UI → API → prompt. That order teaches React, not AI products.

---

## Open decisions for Phase 0

- [x] Model + hosting: **Gemini free tier + Vercel + rate limits**
- [ ] Max upload size for photos (recommend 4 MB)
- [ ] Grade colors: green / amber / red (recommended yes)

---

## Implementation log

### 2026-06-26 — v1.6 saved listings + feedback

- **Product lesson:** saving is personal utility; feedback is product signal; saved listing photos/text require explicit improvement consent before review
- **UI:** result-page workflow now has **Save this listing and verdict** plus **Share feedback** with "What felt off?" tags
- **Storage:** added Supabase Postgres schema for saved listings, photo metadata, feedback, and improvement reviews
- **API:** added `/api/saved-listings` for listing/photo/verdict saves and updated `/api/feedback` to persist feedback tied to saved listings
- **Privacy:** live analysis still does not persist by default; photos are only stored when the user chooses to save the listing
- **Docs:** updated `07_Product_Evolution.md`, README, app README, and env example for Supabase setup
- **Next:** saved-listings page, review workflow, eval expansion from 6 to ~20 cases

### Backlog — eval / UI

- **listing-3 UI demo:** Promoted — see manifest + `public/listings/` (eval pass confirmed)

### 2026-05-31 — Phase 5 complete (deploy + portfolio)

- **Live URL:** https://pick-or-pass-seven.vercel.app/
- **GitHub:** https://github.com/nishanthkadi/pick-or-pass
- **Portfolio:** root `README.md` (merged case study) + screenshots in `portfolio/assets/pick-or-pass/`
- **Portfolio index** updated; project `README.md` + `06_Retrospective.md` written
- **UI polish post-deploy:** sample tile spoilers removed, verdict/details unified, listing collapsed by default, photo carousel

### 2026-05-31 — Phase 4 complete (eval loop + rubric scorer)

- **6 eval cases** registered (`listing-1` … `listing-6`); **6/6 grade match** after prompt iteration
- **Prompt changes** in `system.ts`: grade↔alignment binding, no-price blocks Good, structural damage → Avoid, calibration examples, photo inspection checklist
- **Rubric scorer:** `src/lib/eval/scoreEvalRun.ts` — grade, alignment, visit summary, themes, questions, guardrails
- **Eval CLI:** `--score-only` (no API), `--no-sync` (skip demo overwrite)
- **Docs:** `eval/COLLECTION_GUIDE.md`; v1 scope = 6 cases (skipped expansion to 10)
- **UI demos:** All 6 listings promoted — `manifest.json`, `public/listings/` images, cached demo JSON; multi-photo support via `imageUrls`
- **Deploy prep:** `app/README.md` Vercel section, `.env.example` cleaned up
- **Next:** Phase 5 — deploy to Vercel, screenshots, portfolio case study

### 2026-05-31 — Phase 4 started: listing-3 eval case

- Renamed seed ids: `cruise-ship` → `listing-1`, `minimal-listing` → `listing-2`
- Registered `listing-3` (Minnie kitchen, 3 photos, expected **Avoid**)
- First eval run: model returned **Not sure** — prompt iteration needed (incomplete set + best-offer + promo photo mismatch)

### 2026-05-31 — UI redesign iteration 2 (a11y + hierarchy)

- **Accessibility:** Skip link, semantic landmarks, Radix accordion/collapsible, visible focus rings, `aria-live` for loading/errors, proper file input labeling (no faux `role=button` drop zone), 44px min touch targets
- **Colors:** WCAG AA–oriented design tokens in `globals.css`; grade colors use icon + text label (not color alone)
- **Typography:** Consistent scale — `.text-page-title`, `.text-section-title`, `.text-subsection-title`, `.text-eyebrow` via `SectionHeading`
- **First vs return visit:** `useReturningVisitor` — compact hero + collapsible "How it works" on return; listing context collapsed by default after first results view
- **Results order:** Verdict first, then listing (collapsible), then details accordion
- **UI primitives:** `components/ui/` — Button, Card, Alert, BackLink, Accordion (Radix + lucide)
- **Deps:** `@radix-ui/react-accordion`, `@radix-ui/react-collapsible`, `lucide-react`, `clsx`, `tailwind-merge`

### 2026-05-31 — UI redesign iteration 1

- Branded landing: hero, 3-step how-it-works, path fork (samples vs analyze)
- Listing 1 / Listing 2 sample picker with photos + seller text in results
- Progressive disclosure: verdict first, details in accordions
- Demo API returns `{ listing, analysis }`; images in `public/listings/`
- Self-serve copy for free checks and BYOK (Google AI Studio link)
- Split UI into AppShell, LandingHero, PathSelector, ExamplePicker, AnalyzeForm, ResultsView, etc.

### 2026-05-31 — Phase 3 complete

- Built single-page UI: demo cards, analyze form, BYOK on 429, 6-section results renderer
- Added `npm run dev:stop` to free port 3000 on Windows

### 2026-05-31 — Phase 2 complete

- Built `GET /api/demo/[id]` — cached demos from `src/data/demos/`
- Built `POST /api/analyze` — multipart + JSON, server key + BYOK, Zod validation
- Added `lib/demos/getDemo.ts`, `lib/rate-limit.ts`, `lib/api/parseAnalyzeRequest.ts`
- Rate limits (server key): 3/IP/hour, 20/day global (in-memory; Upstash at deploy)
- Verified: demo 200, live analyze 200 via curl

### 2026-05-30 — Eval migrated to medium structure

- Moved source of truth to `eval/dataset.jsonl` (2 cases, full rubric + notes)
- Added `eval/golden/`, `eval/results/`, `src/lib/eval/loadDataset.ts`
- `npm run eval` (alias `prompt-lab`) reads dataset; syncs golden + demos
- Deprecated `fixtures/listings.ts` → re-exports eval loader

### 2026-05-30 — Phase 1 complete

- Built: prompt lab ran on both seed listings; cached demos saved to `src/data/demos/`
- Model: `gemini-2.5-flash-lite` (Gemini free tier)
- Learned: sparse text must be forced to `not_sure` in system prompt; fix `.env.local` formatting (no spaces/quotes); 429 = wait or switch model
- Results: cruise-ship → good ✓ | minimal-listing → not_sure ✓ (after prompt iteration)
- Next: Phase 2 — `/api/demo` + `/api/analyze` routes

### 2026-05-30 — Phase 1 in progress

- Built: `system.ts` (prompt + guardrails), `analysis.ts` (Zod schema), `gemini/analyze.ts` (multimodal client), `fixtures/listings.ts`, `scripts/prompt-lab.ts`
- Learned: Prompt + schema live in repo; prompt-lab calls Gemini directly before UI exists; JSON validated with Zod after model returns
- Blocked by: Seed images not yet in `../assets/` — add `listing-1-cruise-ship.png` and `listing-2-minimal-text.png`, then `npm run prompt-lab`
- Next: Run prompt lab → save `cruise-ship.json` + `minimal-listing.json` → iterate prompt if grades mismatch

### 2026-05-30 — Phase 0 complete

- Built: Next.js 16 app (TypeScript, Tailwind, App Router) in `app/`; folder skeleton for prompts, schema, gemini, rate-limit, demos, API routes; `.env.example`; app README
- Learned: Secrets belong in `.env.local` (gitignored via `.env*`); server-only env vars never use `NEXT_PUBLIC_` prefix
- Blocked by: none
- Next: Phase 1 prompt lab — add `GEMINI_API_KEY` to `.env.local`, then first multimodal call with Listing 1

### YYYY-MM-DD

- Built:
- Learned:
- Blocked by:
- Next:

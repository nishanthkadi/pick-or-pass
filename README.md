# Pick or Pass

**Worth the drive?** — A visit-worthiness checker for parents buying used toys on Facebook Marketplace.

**Live demo:** https://pick-or-pass-seven.vercel.app/

Paste listing text, add a photo, get **Good / Not sure / Avoid** with reasons and seller questions — or try six real sample listings with no API key.

## Problem & user

**Target user:** Parent buying second-hand toys (ages 3–10) on Facebook Marketplace.

**Problem:** Listings look fine online but fail in person — wasted trips, vague text, photos that hide damage or missing parts.

Parents already use ChatGPT for listing advice, but they re-explain context every session, get inconsistent formats, and can't rely on a single photo upload workflow. The pain is **trip-worthiness**, not product research — "should I drive for this?"

Pick or Pass encodes parent + Marketplace + toy context once, requires both text and photos, and always returns the same structure: grade, visit summary, reasons, seller questions, and honest limits.

## Product approach

**Core flow:** Landing → sample listings (zero API cost) or paste-your-own → unified results with collapsed listing details and expandable verdict sections.

**Key tradeoffs (v1):**

| Ship | Defer |
|------|-------|
| Good / Not sure / Avoid grades | Web research, recalls, price verification |
| 6 cached sample listings | User accounts |
| Server key + rate limits + BYOK | Browser extension |
| Eval set from real Marketplace listings | Fine-tuning |

**UX decisions that mattered:**

- Sample tiles hide the grade until click — users discover the verdict, not spoilers
- Listing details collapsed by default — verdict + "expand for reasons" stays above the fold
- Verdict merged into one **Verdict details** card — less scrolling, clearer hierarchy

## AI approach

- **Model:** Gemini 2.5 Flash Lite (multimodal, structured JSON via schema)
- **Prompt design:** Grade ↔ alignment binding (e.g. `contradicts` → Avoid), photo-first inspection for structural damage, calibration examples from real failure cases
- **Guardrails:** No hype, no proximity-as-signal, no "avoid at all costs" — visit-worthiness framing only
- **What we don't claim:** Seller trust, recalls, exact retail price, or in-person condition guarantees

## What I built

- **Next.js app** on Vercel (`app/`) — landing, 6 sample demos, live analyze API
- **Eval infrastructure** — `eval/dataset.jsonl` (6 real listings), golden outputs, rubric scorer, `--score-only` / `--no-sync` CLI
- **Prompt iteration** — 6/6 grade match after tuning for visible damage, incomplete sets, and missing-price cases
- **Saved listings + feedback loop** — users can save listing text/photos/verdicts, revisit saved listings on the same browser, share feedback, and optionally allow saved listings into the reviewed improvement queue

## Metrics & evaluation

Built a labeled eval set before prompt tweaking (not after vibes):

| Grade | Cases | Example signal |
|-------|-------|----------------|
| Good | 2 | Strong text-photo match, retail screenshot or detail |
| Not sure | 2 | Sparse text or no price / unverified features |
| Avoid | 2 | Structural damage, severely incomplete set |

**Results:** 6/6 grade match after prompt iteration. Rubric scorer checks themes, seller questions, visit summary, and guardrails for regression.

## Screenshots

### Home page

![Home page](./portfolio/assets/pick-or-pass/home-page.png)

### Sample listings

![Sample listings picker](./portfolio/assets/pick-or-pass/sample-listings.png)

### Avoid verdict

![Why this grade — Avoid](./portfolio/assets/pick-or-pass/why-this-grade-avoid.png)

### Good verdict

![Why this grade — Good](./portfolio/assets/pick-or-pass/why-this-grade-good.png)

### Questions to ask the seller

![Questions to ask the seller](./portfolio/assets/pick-or-pass/questions-to-ask-seller.png)

## What I learned

- **Eval cases should come from real listings first** — synthetic examples missed patterns like promo-photo mismatch and "fair/clean" text with visible cracks
- **Models hedge to Not sure** unless prompts explicitly forbid downgrading Avoid when damage is visible in photos
- **Cached demos are a product feature** — portfolio visitors and sample flow don't burn API quota
- **Raw feedback is not training truth** — feedback is stored as signal, while saved listing photos/text require explicit improvement consent before review
- **Deployment is part of the product** — env vars, rate limits, and public URL change how you think about abuse and cost

## What's next

1. Build a small review workflow to promote consented saved listings into eval cases
2. Expand eval set + wire rubric pass rate into CI
3. Add uncertainty UX: evidence source, unknowns, and what would change the grade
4. v2: listing URL paste, optional recall/price research (RAG or tools)
5. Chrome extension only after paste workflow is validated

## Run locally

```bash
cd app
npm install
cp .env.example .env.local   # add GEMINI_API_KEY
npm run dev
```

Saved listings and feedback persistence also require Supabase:

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Create a private Storage bucket named `saved-listing-photos`.
3. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `SUPABASE_SAVED_LISTINGS_BUCKET` to `app/.env.local` and Vercel.

## Eval

```bash
cd app
npm run eval                  # live API run
npm run eval -- --score-only  # score golden outputs only
```

## What's in this repo

| Path | Purpose |
|------|---------|
| `app/` | Next.js web app (deploy root for Vercel) |
| `eval/` | Labeled eval dataset, golden outputs, collection guide |
| `assets/` | Listing images for eval |
| `00_Brief.md` … `04_Build_Notes.md` | PM product docs |
| `06_Retrospective.md` | Project retrospective |
| `07_Product_Evolution.md` | saved-listing and feedback-to-eval roadmap |
| `portfolio/` | Screenshots, portfolio index, case study template |
| `supabase/schema.sql` | saved listings, photos, feedback, and review tables |

## Stack

Next.js · TypeScript · Tailwind · Gemini API · Supabase · Vercel

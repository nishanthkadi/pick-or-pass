# Eval collection guide

How to add Marketplace listings to the Pick or Pass eval set.

**v1 shipped with 6 cases** (`listing-1` … `listing-6`). Add more anytime using the same workflow.

## Target grade mix

Aim for variety so the prompt handles all three outcomes:

| Grade | What it tests | v1 count |
| --- | --- | --- |
| **Good** | Text + photo align; price or retail screenshot; trip-worthy with confirmation | 2 (listing-1, listing-5) |
| **Not sure** | Sparse text, no price, or unverified interactive features | 2 (listing-2, listing-4) |
| **Avoid** | Damage, incomplete set, promo mismatch, best-offer hassle | 2 (listing-3, listing-6) |

You do not need equal counts — but every grade should appear at least twice before you trust prompt changes.

## Capture checklist (per listing)

From Facebook Marketplace, save:

1. **Full seller text** — copy/paste exactly (including rude or odd phrasing)
2. **All listing photos** — real seller shots + any retail/promo images they included
3. **Your PM judgment:**
   - Expected grade: `good` | `not_sure` | `avoid`
   - Why (2–3 sentences)
   - What would make you drive or skip
   - Questions you'd ask (or "not worth asking")
4. **Red flags to note:** missing parts, cracks, stock photos, no price, zip-only text

Do **not** grade on proximity or meetup location — v1 inputs are text + photos only.

## File naming

| Asset | Pattern | Example |
| --- | --- | --- |
| Eval images | `assets/listing-N-1.jpg`, `listing-N-2.jpg`, … | `listing-7-1.jpg` |
| Single-photo case | `assets/listing-N.jpg` | `listing-1.jpg` |
| Case id | `listing-N` (sequential) | `listing-7` |
| Draft JSON | `eval/drafts/listing-N.json` | before registration |
| Golden output | `eval/golden/listing-N.json` | auto on `npm run eval` |
| UI demo JSON | `app/src/data/demos/listing-N.json` | cached analysis |
| UI images | `app/public/listings/listing-N-1.jpg` | served at `/listings/…` |

Use descriptive suffixes only in drafts/notes — committed filenames stay `listing-N`.

## Add a case (recommended workflow)

1. Drop photos in `assets/`
2. Ask the agent to add an eval sample (uses `add-eval-sample` skill), **or**:
   ```bash
   cd app
   npm run eval:add -- --file ../eval/drafts/listing-7.json
   ```
3. Run eval (uses API):
   ```bash
   npm run eval -- listing-7
   ```
4. If grade mismatches, iterate `src/lib/prompts/system.ts` and re-run
5. Update `Eval_Seed_Examples.md` with a human summary

## Scoring

```bash
cd app
npm run eval -- --score-only          # score all golden outputs (no API)
npm run eval -- --score-only listing-3
npm run eval -- --no-sync             # run live but don't overwrite demos
```

Rubric checks: grade, alignment, visit summary semantics, reason themes (≥60%), seller questions (≥50%), guardrails.

## Promote to UI demo

After eval passes:

1. Copy `eval/golden/listing-N.json` → `app/src/data/demos/listing-N.json`
2. Copy images → `app/public/listings/`
3. Add entry to `app/src/data/demos/manifest.json` (`imageUrls` array for multi-photo)
4. Set `use_as_cached_demo: true` in `dataset.jsonl` only if you want future eval runs to refresh the demo (use `--no-sync` when iterating prompt)

## Suggested future cases (when you expand)

- Stock photo / Amazon-only image (Avoid)
- Blurry photo, decent text (Not sure)
- Priced listing with detailed condition (Good)
- Scam pattern (new account vibes, too-good price — Avoid if visible in materials)

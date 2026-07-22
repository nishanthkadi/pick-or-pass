# Product Evolution — Pick or Pass

## v1.6 Goal

Turn Pick or Pass from a static demo into a learning AI product: let users save listings and verdicts, collect feedback with photos for review, promote good examples into evals, then improve prompts or schema with regression checks.

## Why Feedback Does Not Auto-Train The Model

App feedback is useful signal, not automatic truth. A user may mark an answer as unhelpful because the seller ghosted, the pickup was inconvenient, or the price changed. A user may also mark an answer helpful even if the model missed a safety issue.

The right loop is:

```text
Saved listing or feedback
  -> review queue
  -> human-labeled eval candidate
  -> eval dataset update
  -> prompt/schema/model change
  -> regression run
  -> deploy if quality improves
```

## Shipped v1.6 Slice

- Result-page **Save this listing and verdict** workflow
- Supabase Postgres tables for saved listings, photo metadata, feedback, and review decisions
- Supabase Storage bucket for uploaded listing photos
- Same-browser Saved Listings view using anonymous `owner_token`
- Result-page **Share feedback** workflow: thumbs up/down, with "What felt off?" shown only for thumbs down
- Feedback saves the listing case and photos for product improvement review by default
- Manual saved listings default to "Improve app" opt-in but can be unchecked
- Anonymous `owner_token` in localStorage ties same-browser saves and feedback without accounts

## Shipped v1.8 Slice

- Result-page **Evidence summary** derived from existing analysis JSON: confidence line, seen in photos, claimed in text, still unknown, what would change the verdict
- No new model schema fields yet — UI derives buckets from `reasons`, `limitations`, and `seller_questions`
- Prompt tuning for accurate reason source tagging and concrete limitations
- Eval calibration checks for uncertainty quality

## Shipped v1.9 Slice — Eval expansion + eval loop

- Expanded eval set from **6 → 10 cases** with real Marketplace screenshots (`listing-7` through `listing-10`)
- New failure patterns covered: worn wooden-toy paint, interactive power unknown, stock/retail screenshots, simple-toy sparse-text exception
- **Schema hardening:** `normalizeAnalysisPayload` defaults missing `research_recommended` so eval runs don't crash on partial Gemini JSON
- **API resilience:** retry with backoff on 503/429 in `analyze.ts`
- **Prompt iteration** for v1.9 patterns in `system.ts` (stock photos, paint wear, simple-toy Good exception, interactive not_sure)

### v1.9 eval baseline (2026-07-10)

| Metric | Result |
|---|---|
| Cases in dataset | 10 |
| Grade match (cases with goldens, score-only) | **7/7** |
| Full rubric pass | **0/7** (themes/questions/visit wording strict) |
| New cases with live grade match | **1/4** (`listing-8` Not sure ✓) |
| New cases still failing grade | `listing-7` (Good/Not sure vs Avoid), `listing-9` (Not sure vs Avoid), `listing-10` (Not sure vs Good) |

**Next eval step:** Re-run `npm run eval` when Gemini free-tier quota resets; deploy prompt changes if grade match holds ≥ 9/10.

## Next Product Moves

1. Finish prompt calibration on cases 7, 9, 10; optionally expand toward ~20 listings with failure tags.
2. Add bounded research / retrieval-aided recall lookup (v2.0) after eval coverage is stronger.
3. Add delete/export controls for saved listings.
4. Revisit explicit evidence schema fields if source tagging stays unreliable.
5. Promote consented feedback cases into `eval/dataset.jsonl` via `npm run review-feedback` (CLI; SQL Editor fallback).
6. Later: cheap-first model routing when cost/quota hurts (see below) — not current work.

## Longer-term — model cost / quality routing (not building yet)

**Learning (v1.9+ eval):** Grade quality is not only prompt/policy. Subtle photo deal-breakers (e.g. mouthable paint wear on wooden mallets) failed on `flash-lite` and passed on stronger flash. Text/policy failures (sparse playset, unverified interactive) were better fixed with product binds than with a bigger model.

**Proposed later bet:** cheap-first cascade —

1. Default to lite for most analyses
2. Escalate to stronger vision only on high-risk cues (e.g. wood / mouthable paint / structural damage language) or suspicious all-positive Good outputs
3. Do not escalate for cases already handled by code/policy binds

**Watch if built:** % escalated, grade flips on escalate, cost per analysis, false Avoid rate.

Ship only when free-tier cost/quota or volume makes default-stronger-model painful — until then, keep stronger default and treat this as a documented efficiency option.

## Success Metrics

- Percent of analyses marked helpful
- Percent of feedback cases with a clear failure tag
- Number of consented saved listings reviewed and promoted into evals
- Grade match and rubric pass rate on the eval set
- Percent of Not sure outputs that clearly explain what is unknown

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

## Next Product Moves

1. Expand the eval set from 6 to roughly 20 real listings with failure tags.
2. Add bounded research / retrieval-aided recall lookup (v1.9) after eval coverage is stronger.
3. Add delete/export controls for saved listings.
4. Revisit explicit evidence schema fields if source tagging stays unreliable.
5. Promote consented feedback cases into `eval/dataset.jsonl` via Supabase admin review.

## Success Metrics

- Percent of analyses marked helpful
- Percent of feedback cases with a clear failure tag
- Number of consented saved listings reviewed and promoted into evals
- Grade match and rubric pass rate on the eval set
- Percent of Not sure outputs that clearly explain what is unknown

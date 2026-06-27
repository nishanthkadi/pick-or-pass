# Product Evolution — Pick or Pass

## v1.6 Goal

Turn Pick or Pass from a static demo into a learning AI product: let users save listings and verdicts, collect feedback, review consented failure cases, promote good examples into evals, then improve prompts or schema with regression checks.

## Why Feedback Does Not Auto-Train The Model

App feedback is useful signal, not automatic truth. A user may mark an answer as unhelpful because the seller ghosted, the pickup was inconvenient, or the price changed. A user may also mark an answer helpful even if the model missed a safety issue.

The right loop is:

```text
Saved listing + feedback
  -> consented review queue
  -> human-labeled eval candidate with photos when allowed
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
- Result-page **Share feedback** workflow: Helpful / Not helpful, grade outcome, failure tags, optional note
- Feedback is saved for product improvement by default
- Saved listing text/photos/verdicts are only eligible for improvement review when the user opts in
- Anonymous `owner_token` in localStorage ties same-browser saves and feedback without accounts

## Next Product Moves

1. Build a small review workflow to promote consented saved listings into `eval/dataset.jsonl`.
2. Add delete/export controls for saved listings.
3. Expand the eval set from 6 to roughly 20 real listings with failure tags.
4. Add uncertainty UX: evidence source, unknowns, and what would change the grade.
5. Add bounded research only after eval coverage is stronger.

## Success Metrics

- Percent of analyses marked helpful
- Percent of feedback cases with a clear failure tag
- Number of consented saved listings reviewed and promoted into evals
- Grade match and rubric pass rate on the eval set
- Percent of Not sure outputs that clearly explain what is unknown

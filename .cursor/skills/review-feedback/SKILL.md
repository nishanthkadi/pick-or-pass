---
name: review-feedback
description: >-
  Review consented Pick or Pass app feedback from Supabase and promote cases
  into the eval set (photos → assets/, row → dataset.jsonl). Use when the user
  says review feedback, promote feedback to eval, or feedback review queue.
---

# Review Feedback → Eval

Project: `03_Projects/01_Marketplace_Toy_Check/`

Reusable loop (not one-off):

```text
npm run review-feedback                 # list unreviewed / eval_candidate
npm run review-feedback -- show <id>    # details + photos to eval/_review_export/
npm run review-feedback -- reject <id> [--note "..."]
npm run review-feedback -- promote <id> --eval-id listing-N-slug --grade avoid|not_sure|good [--why "..."]
```

Run all commands from `app/` with `.env.local` Supabase admin vars set.

## Rules

1. **Never promote without an explicit expected grade** from the user (or clear agreement in chat).
2. Photos are required for promote; they land in git-tracked `assets/` and are referenced by `dataset.jsonl`.
3. After promote, optionally run `npm run eval -- <eval-id>` (uses API quota) or rely on validation already done by the CLI.
4. For richer rubrics later, refine via `add-eval-sample` / `eval:add`; the CLI writes a valid starter case from listing + model analysis + grade.

## Typical agent flow

1. `npm run review-feedback`
2. `npm run review-feedback -- show <saved_listing_id>`
3. Ask user: promote or reject? If promote: confirm `--eval-id` and `--grade`
4. Run promote (add `--dry-run` first if unsure)
5. Report new dataset id + photo filenames; remind that model behavior only changes after prompt work + eval pass

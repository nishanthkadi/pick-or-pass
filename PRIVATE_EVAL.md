# Private eval & prompt layout

The public GitHub repo showcases the product and **two** sample listings (`listing-1`, `listing-2`). Full eval photos, goldens, dataset rows, seed notes, and the grading system prompt stay **local** (and/or in Supabase).

## What is public vs private

| Public (committed) | Private |
| --- | --- |
| `assets/listing-1.jpg`, `listing-2.jpg` | Other `assets/*.jpg` |
| `app/public/listings/listing-1.jpg`, `listing-2.jpg` | Other public listing images |
| `app/src/data/demos/listing-1.json`, `listing-2.json`, slim `manifest.json` | Extra demo JSON |
| `eval/golden/listing-1.json`, `listing-2.json` | Other goldens |
| `eval/dataset.example.jsonl` (2 cases) | `eval/dataset.jsonl` (full set) |
| `app/src/lib/prompts/system.ts` (loader + public summary) | `system.private.txt` + Supabase `app_config` |
| Process docs (`eval/README.md`, skills, review-feedback CLI) | `Eval_Seed_Examples.md` |

## Sample listings (Supabase demos)

**Production catalog:** table `demo_listings` + public Storage bucket `demo-listings`.

```bash
# Once: run supabase/demos.sql in SQL editor
cd app
npm run sync-demos
```

Uses local `manifest.local.json` (all samples, gitignored) when present, else `manifest.json`.
Live app loads `/api/demos` from Supabase (falls back to committed listing-1/2 files).

## System prompt (Option B — Supabase)

**Source of truth for production:** Supabase table `app_config` key `system_prompt` (RLS on, no client policies — service role only).

**Load order** (`getSystemPrompt()`):

1. Local `system.private.txt` (dev — edit without syncing)
2. Supabase `app_config` (Vercel — no file on disk)
3. `SYSTEM_PROMPT` env (optional bootstrap / emergency fallback)

### One-time setup

1. Run [`supabase/app_config.sql`](./supabase/app_config.sql) in the Supabase SQL editor.
2. From `app/`:

```bash
npm run sync-prompt
```

3. On Vercel you can **remove** `SYSTEM_PROMPT` after a successful sync (optional). Keep `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

### Updating the prompt later

1. Edit `app/src/lib/prompts/system.private.txt`
2. When Cursor/agent touches that file, you should be asked:

   **Want me to run `npm run sync-prompt` to push this prompt to Supabase?**

   (Rule: `.cursor/rules/sync-pick-or-pass-prompt.mdc` + hooks in `.cursor/hooks.json`.)
3. Say yes → agent runs sync from `app/`. Live within ~60s. **No GitHub commit. No Vercel paste. No redeploy.**

You can also say anytime: `sync prompt` / `push prompt to supabase`.

## Local eval setup

```text
app/src/lib/prompts/system.private.txt   ← full prompt (gitignored)
eval/dataset.jsonl                       ← full cases (gitignored)
assets/listing-3-*.jpg …                 ← still on disk, not in git
```

## Fresh clone

1. Copy `eval/dataset.example.jsonl` → `eval/dataset.jsonl` (or restore your private dataset backup).
2. Copy `app/src/lib/prompts/system.private.txt.example` → `system.private.txt` and paste the real prompt (or pull from Supabase).
3. Restore private photos under `assets/` from your backup — not from GitHub.

## Git history note

Removing files from the index does **not** erase them from older commits. Blobs for private photos/prompt may still exist in history until you rewrite history (e.g. `git filter-repo`) or treat the repo as process-showcase only. Ask before any history rewrite.

## Feedback → eval

`npm run review-feedback` still writes photos to `assets/` and appends `eval/dataset.jsonl`. Those paths remain local/private by default thanks to `.gitignore`.

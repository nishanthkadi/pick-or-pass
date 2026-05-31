# Eval Dataset

Canonical eval data for Marketplace Toy Check. **Source of truth:** `dataset.jsonl`.

Human-readable summaries also live in [`../Eval_Seed_Examples.md`](../Eval_Seed_Examples.md).

## Folder layout

```text
eval/
  dataset.jsonl       ← one JSON object per line (test cases)
  golden/             ← reference model outputs
  results/            ← run outputs (gitignored)
  README.md
assets/               ← listing images (referenced by image_dir in dataset)
app/src/data/demos/   ← synced cached demos for runtime ($0 demo path)
```

## Add a new test case

**Easy way:** ask the agent to add an eval sample (uses the `add-eval-sample` skill — sequential prompts + validation).

**CLI way** from `app/`:

```bash
npm run eval:add -- --dry-run --file case.json
npm run eval:add -- --file case.json
npm run eval:add -- --id stock-photo --grade avoid --description "..." --images listing-3.jpg
```

**Manual way:**

1. Add image(s) to `../assets/`
2. Add one line to `dataset.jsonl` (or use `npm run eval:add` above)
3. Run:

```bash
npm run eval
npm run eval -- cruise-ship
```

4. Review output in `golden/` and synced `app/src/data/demos/`

Paths `golden/{id}.json` and `app/src/data/demos/{id}.json` are auto-filled when using `eval:add`.

## Dataset fields

### Required (every case)

| Field | Purpose |
| --- | --- |
| `id` | Unique case id (used in CLI) |
| `description` | Listing text input (≥10 chars) |
| `image_files` | Filenames under `image_dir` |
| `tags` | 1–8 labels for filtering (e.g. `sparse_text`, `scam_pattern`) |
| `expected.grade` | `good` \| `not_sure` \| `avoid` |
| `expected.text_photo_alignment` | `matches` \| `partially_matches` \| `contradicts` \| `insufficient_text` |
| `expected.visit_summary_must_convey` | Semantic check for visit_summary (not exact wording) |
| `expected.must_include_reason_themes` | 3–6 reason themes the output should cover |
| `expected.should_ask_seller` | 3–6 seller questions the output should include |
| `expected.must_not_include` | 2–5 guardrails the output must avoid (hype, proximity, etc.) |
| `notes.photo_signal` | Human read on the photo (≥20 chars) |
| `notes.why_this_grade` | PM rationale for the expected grade (≥20 chars) |

### Optional

| Field | Purpose |
| --- | --- |
| `image_dir` | Relative to project root (default `assets`) |
| `notes.pm_note` | Product constraint for edge cases |
| `rag_expectations` | Reserved for v3 RAG eval |
| `golden_output_path` | Auto-filled: `golden/{id}.json` |
| `use_as_cached_demo` | Sync output to demo path (default true via `eval:add`) |
| `demo_output_path` | Auto-filled: `app/src/data/demos/{id}.json` |

## Scoring

```bash
cd app
npm run eval -- --score-only       # score golden outputs (no API calls)
npm run eval -- --no-sync          # live run, skip demo JSON sync
```

**Checks:** grade, alignment, visit summary semantics, reason themes (≥60%), seller questions (≥50%), guardrails.

See [`COLLECTION_GUIDE.md`](COLLECTION_GUIDE.md) for collection workflow.

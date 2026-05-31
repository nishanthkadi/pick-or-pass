# Eval seed images

Listing photos referenced by [`eval/dataset.jsonl`](../eval/dataset.jsonl). UI copies live in [`app/public/listings/`](../app/public/listings/).

| Files | Eval case | Expected grade |
| --- | --- | --- |
| `listing-1.jpg` | `listing-1` | Good |
| `listing-2.jpg` | `listing-2` | Not sure |
| `listing-3-1.jpg` … `listing-3-3.jpg` | `listing-3` | Avoid |
| `listing-4-1.jpg` … `listing-4-3.jpg` | `listing-4` | Not sure |
| `listing-5-1.jpg`, `listing-5-2.jpg` | `listing-5` | Good |
| `listing-6-1.jpg` | `listing-6` | Avoid |

Run evals from `app/`:

```bash
npm run eval
npm run eval -- listing-1
npm run eval -- --score-only
npm run eval -- --no-sync
```

Outputs save to:
- `eval/golden/` — reference outputs
- `app/src/data/demos/` — synced cached demos (when `use_as_cached_demo: true` and not `--no-sync`)
- `eval/results/` — run log (dated JSONL)

See [`eval/COLLECTION_GUIDE.md`](../eval/COLLECTION_GUIDE.md) for adding new cases.

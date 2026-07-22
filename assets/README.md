# Eval seed images

**Public repo:** only `listing-1.jpg` and `listing-2.jpg` are committed (portfolio examples).

**Local / private:** keep the full photo set here for eval. Extra files are gitignored and stay on your machine.

| Files (public) | Eval case | Expected grade |
| --- | --- | --- |
| `listing-1.jpg` | `listing-1` | Good |
| `listing-2.jpg` | `listing-2` | Not sure |

UI copies of the public examples live in `app/public/listings/`.

Full private dataset: copy `eval/dataset.example.jsonl` → `eval/dataset.jsonl` on a fresh clone, then restore your private cases + photos locally (they are not on GitHub).

```bash
cd app
npm run eval
npm run eval -- listing-1
npm run eval -- --score-only
```

See [`eval/README.md`](../eval/README.md) and [`PRIVATE_EVAL.md`](../PRIVATE_EVAL.md).

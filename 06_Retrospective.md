# Retrospective — Pick or Pass

## What I Built

A deployed web app that helps parents decide whether a Facebook Marketplace used-toy listing is worth a trip. v1 includes six cached sample listings, live multimodal analysis, BYOK after rate limits, and an eval loop with six real Marketplace cases.

**Live:** https://pick-or-pass-seven.vercel.app/

## What I Learned About AI

- Structured outputs + Zod validation beat free-form chat for a product users revisit
- Prompt iteration without labeled evals is guessing — 3/6 grade match before tweaks, 6/6 after
- Models default to **Not sure** when they see problems but aren't told to commit to **Avoid** for visible damage
- `--score-only` eval runs save API quota during rubric work
- Temperature 0.2 + explicit calibration examples improve consistency more than longer prose
- Raw app feedback is signal, not automatic training truth — review it before promoting cases into evals

## What I Learned About The User

- The job is **trip-worthiness**, not "is this a good toy?"
- Parents want seller questions they can copy, not another chat thread
- Sample listings must not spoil the verdict on the picker tile
- Collapsed listing + prominent verdict details keeps focus on the decision, not re-reading seller text

## What Product Decisions Mattered

1. **Eval before prompt polish** — real listings exposed Avoid patterns synthetic briefs missed
2. **Cached demos** — portfolio and sample path work without burning Gemini quota
3. **Defer accounts, research, extension** — shipped a credible MVP in one repo
4. **Combined verdict card** — reduced scroll and made expandable analysis discoverable above the fold
5. **Six cases, not ten** — shippable eval coverage without blocking deploy

## What Worked

- Phase order: prompt lab → API → UI → eval → deploy
- Grade ↔ alignment binding in system prompt
- Multi-photo carousel so description text stays readable
- GitHub + Vercel with `app/` as root directory

## What Did Not Work

- First prompt treated visible cracks as "ask seller about damage" (Not sure) instead of Avoid
- Returning-visitor collapse logic initially hid listing on sample flow when we wanted the opposite, then we settled on always collapsed
- Full rubric pass rate is stricter than grade match — themes/questions need ongoing tuning

## What I Would Improve

- Upstash rate limits for production
- Saved-listings page plus a small review workflow
- CI gate on grade match across eval set
- Short Loom demo for portfolio
- Rename screenshot asset "Details about the analysis" to match "Verdict details" UI label

## Portfolio Takeaway

This project shows I can scope an AI product to a real user pain, build eval infrastructure before iterating prompts, ship a public demo, and document tradeoffs — not just prototype a chatbot.

## Next Capability To Learn

Feedback-to-eval review workflows, automated eval in CI, observability (log failures by case tag), or a v2 research layer with explicit tool boundaries.

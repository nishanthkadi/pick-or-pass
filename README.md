# Pick or Pass

**Worth the drive?** — A visit-worthiness checker for parents buying used toys on Facebook Marketplace.

**Live demo:** https://pick-or-pass-seven.vercel.app/

Paste listing text, add a photo, get **Good / Not sure / Avoid** with reasons and seller questions — or try six real sample listings with no API key.

## Why this exists

Listing text can be gamed; photos anchor trust. ChatGPT makes you re-explain context every time. Pick or Pass bakes in parent + Marketplace + toy context and returns structured output every run.

## What's in this repo

| Path | Purpose |
|------|---------|
| `app/` | Next.js web app (deploy root for Vercel) |
| `eval/` | Labeled eval dataset, golden outputs, collection guide |
| `assets/` | Listing images for eval |
| `00_Brief.md` … `04_Build_Notes.md` | PM product docs |
| `06_Retrospective.md` | Project retrospective |
| `portfolio/` | Case study, index, screenshots |

## Run locally

```bash
cd app
npm install
cp .env.example .env.local   # add GEMINI_API_KEY
npm run dev
```

## Eval

```bash
cd app
npm run eval                  # live API run
npm run eval -- --score-only  # score golden outputs only
```

## Screenshots

### Home page

![Home page](./portfolio/assets/pick-or-pass/home-page.png)

### Sample listings

![Sample listings picker](./docs/screenshots/sample-listings.png)

### Avoid verdict

![Why this grade — Avoid](./portfolio/assets/pick-or-pass/why-this-grade-avoid.png)

### Good verdict

![Why this grade — Good](./docs/screenshots/why-this-grade-good.png)

### Questions to ask the seller

![Questions to ask the seller](./portfolio/assets/pick-or-pass/questions-to-ask-seller.png)

**Case study:** [portfolio/Pick_or_Pass_Case_Study.md](./portfolio/Pick_or_Pass_Case_Study.md)

## Stack

Next.js · TypeScript · Tailwind · Gemini API · Vercel

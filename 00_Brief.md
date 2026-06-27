# Project Brief

## One-Line Concept

A visit-worthiness checker for parents buying used toys on Facebook Marketplace — paste the listing, upload a photo, get Good / Not sure / Avoid before you drive.

## Target User

Parent buying second-hand toys for children ages 3–10 on Facebook Marketplace.

## User Problem

Parents waste trips when listings look promising online but fail expectations in person. Listing text can be gamed; photos are essential but hard to interpret without structure.

## Why AI

AI can cross-check listing text against photos, flag mismatches and vagueness, and produce a consistent visit-worthiness grade with seller questions — without the user re-explaining their priorities every time like with ChatGPT.

Better than ChatGPT because:
- Parent + Marketplace toy context is built in
- Multimodal (text + photo) is required, not optional
- Structured output every time: grade, reasons, questions
- Guardrails against hype and overconfident claims

## AI Capability To Learn

- **Primary (v1):** Multimodal input or output + structured outputs + evaluation and quality control
- **Next:** Deployment and observability; later RAG and agentic workflows

## Smallest Credible Version

Web app: paste listing text + upload ≥1 photo → Good / Not sure / Avoid + reasons + seller questions. No analysis without both inputs.

## Portfolio Signal

Shows pain-first product thinking, honest AI scoping (what we cannot know), multimodal MVP, and eval-driven quality — not a generic chat wrapper.

## Shareability Hook

"Paste a Marketplace toy listing before you drive — see if it's worth the trip."

## Current Stage

- **Shipped v1.6** — https://pick-or-pass-seven.vercel.app/
- Added saved listings, uploaded photo storage, and feedback tied to reviewed improvement consent
- Portfolio write-up: root `README.md`

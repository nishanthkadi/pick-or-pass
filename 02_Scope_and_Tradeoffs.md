# Scope And Tradeoffs

## Goal

Help parents avoid wasted Marketplace toy trips by grading visit-worthiness from listing text + photos before they drive or pay a deposit.

## Product Rules (Guardrails)

These are non-negotiable behaviors for v1. They will live in the product spec and later in the system prompt.

### Input rules

- **MVP requires both:** listing text **and** at least one uploaded photo.
- **No analysis runs** if either input is missing. Show a clear message explaining why.

### Output rules — always

- Use visit-worthiness framing, not product guarantees.
- Return one of: **Good**, **Not sure**, or **Avoid**.
- Include reasons tied to evidence from text and/or photo.
- For **Not sure**, include specific questions to ask the seller before driving.
- State confidence limits: what the analysis can and cannot assess from listing materials alone.

### Output rules — never

- Hype or urgency: e.g. "This is a great listing, don't miss this."
- Unverified safety claims: e.g. "This neighborhood isn't safe."
- Absolute commands without nuance: e.g. "Avoid at all costs."
- Inappropriate or invasive seller questions: race, criminal history, etc.
- Claims of completeness, safety certification, or exact retail value unless clearly supported by visible evidence.

### Allowed framing examples

- "Worth a trip if you confirm X with the seller."
- "Not sure — ask about Y before driving."
- "Listing raises concerns Z — consider skipping unless seller answers convincingly."

## Non-Goals (v1)

- Facebook profile, seller ratings, or past listings analysis
- User preferences, sensitivities, or session history
- Browser extension / auto-grab from Marketplace page
- Meetup location safety assessment
- Automated web research, price lookup, or reverse image search
- Deposit / payment recommendation
- Agree-disagree feedback loop and rerun (v1.5)
- Distance / proximity as a grading signal
- All toy categories — v1 focuses on toys for ages 3–10

## MVP Scope

- Paste listing description text
- Upload minimum 1 photo (support multiple optional)
- **Hard block:** nudge for full information; no analysis without text + photo
- Multimodal analysis with explicit **text vs photo cross-check**
- Structured output:
  - Grade: Good / Not sure / Avoid
  - Reasons tied to evidence
  - Seller follow-up questions (always for Not sure; optional for Good/Avoid)
  - Confidence limits (what we cannot know)
  - **Additional research recommended** — caution that retail price, recalls, and seller trust are not verified in v1; product will eventually do its own digging
- Product guardrails enforced in every response
- Eval seed set: 10+ labeled listings (starting with `Eval_Seed_Examples.md`)

## Later Scope

- **v1.5:** "Do you agree?" feedback → one rerun with user correction
- **v2:** Chrome extension to grab text + photos from Marketplace listing page
- **v2+:** Seller profile signals (rating, listing history)
- **v3 (fast-track priority):** Automated web research — product does its own digging (retail price, product identity, recalls, comparable listings)
- **v3+:** RAG over scam patterns / parent checklist; full eval pipeline with labeled examples

## Key Tradeoffs

| Decision | Option A | Option B | Choice | Why |
| --- | --- | --- | --- | --- |
| Input | Text only | Text + photo | Text + photo | Text alone is gameable; photos anchor trust |
| Distribution | Paste web app first | Extension first | Paste first | Faster to ship; validates output quality |
| Feedback loop | In v1 | In v1.5 | v1.5 | Grade quality must work before adding rerun |
| Grade type | Red flags only | Good / Not sure / Avoid | 3-way grade | Matches parent decision: go, ask, skip |
| Web research | In v1 | Deferred | Deferred (v1) | Learn multimodal + evals first; fast-track to v3 |
| Hosting / inference | Paid API | Gemini free + Vercel + rate limits | Gemini free + Vercel + rate limits | Public demo at $0; caps prevent abuse |

## Risks

- **Product risk:** Overconfident grades from photos; parents trust tool and still waste trips
- **Technical risk:** Multimodal prompt quality inconsistent across toy types
- **Data or privacy risk:** Photos may contain home/location details in background
- **Quality risk:** Without eval set, output feels generic like ChatGPT
- **Adoption risk:** Upload friction vs paste-only ChatGPT

## Constraints

- v1 is manual copy + upload workflow
- No Facebook API or scraping in v1
- Must work with common phone photos of listings

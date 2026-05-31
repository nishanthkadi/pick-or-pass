# Product Spec — Marketplace Toy Check (v1)

## Summary

Web app for parents buying used toys (ages 3–10) on Facebook Marketplace. User pastes listing text and uploads at least one photo. App returns a visit-worthiness analysis before they drive to a meetup.

**Job:** Avoid wasted trips when listing expectations won't match reality.

## User Journey

1. **User arrives with:** A Marketplace listing they are considering; deciding whether to drive or message seller.
2. **User provides:** Listing description (paste) + 1–5 photos (upload).
3. **Product does:** Validates inputs → multimodal analysis → structured visit-worthiness report.
4. **User receives:** Grade, summary, evidence-based reasons, text-vs-photo check, seller questions, limits, research nudge.
5. **User can then:** Message seller, skip the trip, or go with eyes open on what to verify in person.

---

## Output Schema (v1)

### Design principles

- **First screen:** Grade + one-line visit summary (scannable in 3 seconds).
- **Evidence-linked:** Every reason cites `[text]`, `[photo]`, or `[text + photo]`.
- **Honest limits:** Always show what we cannot know.
- **No web research in v1:** Always show "additional research recommended" with future capability note.
- **Questions:** Always shown; more critical for Not sure / Avoid.

---

### Parent-facing layout (section order)

```text
1. Grade + visit summary          ← hero, first thing user sees
2. Text vs photo                  ← cross-check (always present)
3. Reasons                        ← max 5, evidence-tagged
4. Questions to ask the seller    ← bullets + optional copy-paste message
5. What we can't tell from this listing
6. Additional research recommended
```

---

### Field definitions

#### 1. Grade + visit summary

| Field | Type | Values / rules |
| --- | --- | --- |
| `grade` | enum | `good` \| `not_sure` \| `avoid` |
| `grade_label` | string | Display: **Good** / **Not sure** / **Avoid** |
| `visit_summary` | string | One sentence, visit-worthiness framing. Max ~120 chars. |

**Visit summary templates (model fills `{...}`):**

| Grade | Template |
| --- | --- |
| Good | "Worth a trip if you confirm {key_uncertainty} with the seller first." |
| Not sure | "Don't drive yet — ask the seller about {top_gap} before committing." |
| Avoid | "This listing has enough concerns ({top_concern}) — consider skipping unless the seller answers convincingly." |

**Guardrails:** No hype ("don't miss this"), no absolutes ("avoid at all costs"), no unverified safety claims.

**Examples:**

- Listing 1 (cruise ship): **Good** — "Worth a trip if you confirm it's the full set and still available."
- Listing 2 (minimal text): **Not sure** — "Don't drive yet — ask about age range, completeness, and price before committing."

---

#### 2. Text vs photo

| Field | Type | Values / rules |
| --- | --- | --- |
| `text_photo_alignment` | enum | `matches` \| `partially_matches` \| `contradicts` \| `insufficient_text` |
| `alignment_summary` | string | 1–2 sentences explaining alignment |
| `mismatches` | array | 0–3 items; empty if fully aligned. Only populated when issues exist. |

**Mismatches item:**

```json
{
  "issue": "Description claims 'complete set' but photo shows only packaging",
  "sources": ["text", "photo"]
}
```

**Rules:**

- Section always shown (even if "matches").
- If text is empty or minimal → `insufficient_text`, not `matches`.
- Listing 1 → `matches`. Listing 2 → `insufficient_text` or `partially_matches`.

---

#### 3. Reasons

| Field | Type | Rules |
| --- | --- | --- |
| `reasons` | array | Max **5** items |
| `reasons[].text` | string | Clear, specific observation |
| `reasons[].source` | enum | `text` \| `photo` \| `text_and_photo` |
| `reasons[].sentiment` | enum | `positive` \| `neutral` \| `concern` |

**Rules:**

- At least 1 reason required.
- Prefer mixing sources when both text and photo contributed.
- Mismatches from section 2 may appear here but should not duplicate verbatim.

---

#### 4. Questions to ask the seller

| Field | Type | Rules |
| --- | --- | --- |
| `seller_questions` | array | Max **6** bullets |
| `seller_message_draft` | string | Optional copy-paste paragraph combining top 3–4 questions |

**Default questions pool** (include when relevant):

- Is this still available?
- Is this the complete set? Anything missing?
- Any damage, cleanliness, or safety issues to know before I drive?
- When was it purchased? Original price or retail link?
- What ages is this appropriate for?

**Rules:**

- **Good:** 3–4 questions (confirm before trip).
- **Not sure:** 4–6 questions (fill information gaps).
- **Avoid:** 3–4 questions (give seller chance to resolve concerns) + softer framing in summary.
- Never suggest invasive questions (race, criminal history, etc.).

---

#### 5. What we can't tell from this listing

| Field | Type | Rules |
| --- | --- | --- |
| `limitations` | array | **Always shown.** 3–5 fixed-category bullets, customized per listing |

**Standard categories (pick relevant ones each time):**

- Actual condition in person (wear, cleanliness, missing small parts)
- Whether description honesty matches reality
- Retail price or whether the deal is fair
- Product recalls or age-safety certification
- Seller trustworthiness or meetup safety
- Whether photos show the exact item you'll receive

---

#### 6. Additional research recommended

| Field | Type | Rules |
| --- | --- | --- |
| `research_recommended` | array | **Always shown.** 2–4 items |
| `future_capability_note` | string | Fixed v1 disclaimer (below) |

**Typical items:**

- Look up retail price (Amazon, Target, manufacturer site)
- Search product name + "recall" for safety
- Check seller profile and other listings on Facebook (manual for now)
- Reverse image search if photos look like stock images

**Fixed v1 note:**

> "We don't verify prices, recalls, or seller history yet — you'll need to check these yourself. A future version of this product will do that research for you."

---

### Multiple photos (v1)

- **One combined analysis** with overall grade.
- If photos conflict: note in `alignment_summary` or `reasons`; lean toward **Not sure** unless one photo is clearly primary listing image.
- Do not produce per-photo sections in v1 (keeps UI simple).

---

### Input validation / error states

| State | Condition | Message |
| --- | --- | --- |
| Missing text | Photo only | "Add the listing description before we analyze. Sellers often game text — we need it to cross-check against your photo." |
| Missing photo | Text only | "Upload at least one photo of the listing. We can't grade visit-worthiness from text alone." |
| Both missing | Empty submit | "Paste the listing description and upload at least one photo to get started." |
| Loading | Analysis running | "Checking if this trip is worth it…" |
| Analysis failed | API / model error | "Something went wrong. Try again or upload a clearer photo." |

**Hard block:** Analyze button disabled or no-op until text + ≥1 photo present.

---

## Structured output (JSON schema for API)

Use this schema for model structured output / parsing:

```json
{
  "grade": "good | not_sure | avoid",
  "grade_label": "Good | Not sure | Avoid",
  "visit_summary": "string",
  "text_photo_alignment": "matches | partially_matches | contradicts | insufficient_text",
  "alignment_summary": "string",
  "mismatches": [
    {
      "issue": "string",
      "sources": ["text", "photo"]
    }
  ],
  "reasons": [
    {
      "text": "string",
      "source": "text | photo | text_and_photo",
      "sentiment": "positive | neutral | concern"
    }
  ],
  "seller_questions": ["string"],
  "seller_message_draft": "string",
  "limitations": ["string"],
  "research_recommended": ["string"],
  "future_capability_note": "string"
}
```

---

## Example outputs (eval anchors)

### Listing 1 — Peppa Pig cruise ship → Good

```yaml
grade: good
visit_summary: "Worth a trip if you confirm it's the full set and still available."

text_photo_alignment: matches
alignment_summary: "Description matches what's visible — cruise ship, figures, and accessories align with the photo."

reasons:
  - text: "Description is specific (figures, slide, pool, ball pit) and matches visible items"
    source: text_and_photo
    sentiment: positive
  - text: "Photo appears to be a real home setting, not a stock image"
    source: photo
    sentiment: positive
  - text: "Image quality is high enough to assess included items"
    source: photo
    sentiment: positive

seller_questions:
  - "Is this still available?"
  - "Is this the complete set with all pieces and accessories?"
  - "Any damage or missing parts not visible in the photo?"
  - "Do you know the original retail price or when you purchased it?"

limitations:
  - "We can't verify actual condition or missing small parts until you see it in person"
  - "We haven't verified retail price or whether this is a fair deal"
  - "We can't assess seller trustworthiness from the listing alone"

research_recommended:
  - "Look up this playset's retail price online"
  - "Confirm age range on the manufacturer's listing"
```

### Listing 2 — Minimal text Peppa house → Not sure

```yaml
grade: not_sure
visit_summary: "Don't drive yet — ask about age range, completeness, and price before committing."

text_photo_alignment: insufficient_text
alignment_summary: "Photo shows a substantial Peppa playset with figures and vehicles, but the description is too sparse to cross-check details."

reasons:
  - text: "Description lacks brand clarity, dimensions, condition, and age range"
    source: text
    sentiment: concern
  - text: "Photo quality is good and suggests a genuine seller photo"
    source: photo
    sentiment: positive
  - text: "Cannot confirm completeness or what's included beyond 'extra characters and vehicles'"
    source: text_and_photo
    sentiment: concern

seller_questions:
  - "Is this still available?"
  - "What's the exact product name or set? Is this the complete set?"
  - "What ages is this appropriate for?"
  - "Any damage, missing pieces, or cleanliness issues?"
  - "What's your asking price, and do you know the original retail price?"
  - "Can you share another photo of all pieces laid out?"

limitations:
  - "We can't verify retail price or deal quality without more information"
  - "We can't confirm age-appropriateness or safety from this listing"
  - "We haven't checked seller ratings or profile (not available in v1)"

research_recommended:
  - "Look up this playset online to compare retail price"
  - "Check seller's other listings and ratings on Facebook manually"
  - "Search product name + recall before buying for a young child"
```

---

## AI Requirements

- **Model:** Google Gemini Flash (multimodal — text + image), via Google AI Studio API
- **Hosting:** Vercel (free tier); code on GitHub
- **Cost model:** $0 target — cached demos default; server-key path rate limited; BYOK when limit hit
- **Inputs:** Listing text (string) + 1–5 images
- **Outputs:** JSON schema above, rendered as parent-facing sections
- **Prompting:** System prompt encodes product rules from `02_Scope_and_Tradeoffs.md`; user message contains text + images
- **Structured output:** JSON schema enforcement + Zod validation on server
- **Retrieval / memory:** None in v1
- **Tool use:** None in v1 (web research deferred to v3)
- **Evaluation:** Compare output to `Eval_Seed_Examples.md`; expand to 10+ labeled listings

## UX Requirements

- **Entry point:** Cached demo cards **above the fold** — "Try an example" before custom analyze
- **Demo path:** One click → instant results from cached JSON ($0, no rate limit)
- **Custom path:** Paste area + photo upload + Analyze button
- **Rate limit state:** Friendly 429 message + prompt to try cached demo or use BYOK
- **BYOK path:** Collapsible "Use my Gemini API key" — shown on limit or via link; key never stored
- **Core screen:** Demos → input → results below
- **Empty state:** Brief explanation + two demo cards (not blank form)
- **Loading state:** "Checking if this trip is worth it…" (live path only)
- **Error state:** See validation table above
- **Output format:** Grade hero → 6 sections (same renderer for cached + live)

## Acceptance Criteria

- [ ] Cached demos load without API call
- [ ] Custom analysis blocked without text + ≥1 photo
- [ ] BYOK path works when rate limit hit
- [ ] Server-key path enforces rate limits; BYOK bypasses them
- [ ] Every response includes all 6 output sections
- [ ] Grade is always one of Good / Not sure / Avoid
- [ ] Every reason has a source tag
- [ ] Text vs photo section always present
- [ ] Limitations and research sections always present
- [ ] Future capability note always present in v1
- [ ] No guardrail violations (hype, safety claims, invasive questions)
- [ ] Listing 1 eval produces **Good** with matching alignment
- [ ] Listing 2 eval produces **Not sure** with insufficient_text alignment

## Open Questions

- [ ] Max photo count in v1 UI (recommend 5)
- [ ] Show grade color coding (green / amber / red)?
- [ ] Store analysis history locally (out of v1 scope — confirm stay out)

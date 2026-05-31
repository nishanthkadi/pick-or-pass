# Architecture — Marketplace Toy Check (v1)

Read this before Phase 0. Each component exists for a reason.

---

## System overview

```text
┌─────────────────────────────────────────────────────────────────┐
│  USER (parent in browser)                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js React — runs in browser)                     │
│  • Cached demo cards (default — no API cost)                    │
│  • Custom input: paste text + upload photos                     │
│  • Results renderer (6 sections from JSON)                      │
│  • BYOK form (shown when rate limit hit)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  API ROUTES (Next.js server — runs on Vercel, NOT in browser)   │
│                                                                 │
│  GET  /api/demo/[id]     → return cached JSON (zero AI cost)   │
│  POST /api/analyze       → live analysis path                   │
│       1. Validate inputs                                        │
│       2. Check rate limits (server key path only)               │
│       3. If limited → 429 + prompt for BYOK                     │
│       4. Call Gemini (server key OR user key)                   │
│       5. Validate response with Zod                             │
│       6. Return JSON to frontend                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  CACHED DEMOS            │   │  GEMINI API              │
│  Static JSON in repo     │   │  Multimodal inference    │
│  (Peppa listings 1 & 2)  │   │  Text + images in        │
│  $0, instant, deterministic│  │  Structured JSON out     │
└──────────────────────────┘   └──────────────────────────┘
```

**Hosting:** GitHub stores code → Vercel builds and serves the app → Gemini runs only on live `/api/analyze` calls.

---

## Three ways to get a result

| Path | When | API cost | Rate limit |
| --- | --- | --- | --- |
| **1. Cached demo** | User clicks "Try example: Cruise ship" or "Minimal listing" | **$0** | None |
| **2. Live (server key)** | User pastes own listing + photos | Your free tier | Yes — per IP + daily cap |
| **3. BYOK** | User hit limit OR chooses "Use my API key" | **User pays** | No cap from you |

**Product default:** Path 1 is prominent on landing. Path 2 is "Analyze my listing." Path 3 is the fallback — not the primary UX.

**Why:** Visitors exploring your portfolio should burn **cached demos**, not your Gemini quota on random listings.

---

## Component-by-component

### 1. Frontend (React / Next.js pages)

**What it is:** The web page users see — buttons, text areas, file upload, results.

**What it does NOT do:** Call Gemini directly. Never hold your `GEMINI_API_KEY`.

**Why separate:** Anything in the browser is visible to users. Secrets must stay on the server.

**Key UI areas:**

- **Demo section** — two cards loading cached results instantly
- **Custom analyze form** — text + photos + submit
- **Results panel** — renders JSON into 6 sections
- **BYOK panel** — appears on 429 or via "Use my own key" link

---

### 2. Cached demos (static JSON)

**What it is:** Pre-generated analysis files stored in the repo, e.g. `app/data/demos/listing-1.json`.

**What it does:** Returns the same output every time for your two Peppa seed listings — no model call.

**Why it exists:**

- $0 inference for portfolio visitors
- Instant load — good first impression
- Stable eval baseline ("does live output match cached quality?")
- Shows full UX without burning quota

**How built:** Run Phase 1 prompt lab once per listing → save good JSON → serve via `GET /api/demo/[id]` or import directly in frontend.

---

### 3. API route — `/api/analyze`

**What it is:** Server-only function that receives listing text + images and returns analysis JSON.

**Why not call Gemini from frontend:** API key exposure + no rate limiting + no validation layer.

**Responsibilities (in order):**

1. **Input validation** — text + ≥1 photo required; size limits
2. **Auth path decision** — server key vs user-provided key (BYOK)
3. **Rate limit check** — only when using server key
4. **Prompt assembly** — system prompt + user content + images
5. **Gemini call** — multimodal request
6. **Zod validation** — reject malformed model output
7. **Response** — JSON to frontend or error code

---

### 4. API route — `/api/demo/[id]`

**What it is:** Thin route that returns cached JSON for demo IDs (`cruise-ship`, `minimal-listing`).

**Why a route instead of importing JSON in frontend:** Same response shape as live analyze; frontend uses one renderer for both paths.

---

### 5. System prompt

**What it is:** Instructions sent to Gemini on every live call (not shown to user).

**What it encodes:** Product rules from `02_Scope_and_Tradeoffs.md` — grades, guardrails, section structure, never-say list.

**Why it matters:** This is the **product brain** in v1. UI changes are cheap; prompt changes change behavior.

**Lives in:** `app/lib/prompts/system.ts` (or similar) — single source of truth.

---

### 6. Structured output schema + Zod

**What it is:** JSON shape the model must return; Zod validates it on the server.

**Why both:**

- **Schema in prompt** — tells the model what to produce
- **Zod** — catches when the model drifts (missing fields, wrong enum values)

**Why it matters for learning:** This is how you make AI output **testable** — same reason you defined the spec before building.

---

### 7. Rate limiter

**What it is:** Server-side gate counting requests per IP and globally per day — **server key path only**.

**Suggested v1 limits:**

- 3 requests / IP / hour
- 20 requests / day globally (all users)

**When exceeded:** HTTP `429` + message + show BYOK form.

**Learning note:** Vercel serverless is stateless — in-memory counters reset per instance. For production v1 at $0, options include:

- **Upstash Redis** (free tier) — recommended for real rate limiting
- **Simple global cap in Upstash** — good enough for portfolio scale

We can start with a simpler approach in dev and add Upstash in Phase 2. Document the tradeoff when we build.

**BYOK bypasses your rate limit** — user pays with their key; you still validate inputs and output schema.

---

### 8. BYOK (Bring Your Own Key)

**What it is:** User pastes their Gemini API key when your limit is hit (or proactively).

**Flow:**

```text
User submits analyze + optional apiKey in request body
  → If apiKey present: use it for Gemini call, skip rate limit
  → If no apiKey: use GEMINI_API_KEY from env, apply rate limits
  → Key is NEVER stored, logged, or written to disk
  → Key exists only for duration of that request
```

**Why it exists:** $0 for you while still allowing unlimited use for motivated users (you, technical peers).

**UX copy when limited:**

> "Free demo limit reached. Try a cached example above, come back tomorrow, or paste your own Gemini API key to analyze now."

**Security rules:**

- HTTPS only (Vercel default)
- Key only in POST body to your API route
- Never echo key back in responses
- Optional: "Use my key" collapsible — not the hero CTA

---

### 9. Gemini API

**What it is:** Google's multimodal model endpoint — accepts text + images, returns text (we request JSON).

**Why Gemini:** Free tier, multimodal, good enough for v1 at $0.

**What you send:** System prompt + listing text + base64 images

**What you get back:** Raw text (hopefully JSON) → parsed and validated

**Cost:** $0 on free tier within quotas; BYOK shifts cost to user.

---

### 10. GitHub + Vercel

| Piece | Role |
| --- | --- |
| **GitHub** | Source code, README, demo screenshots, PM docs |
| **Vercel** | Builds Next.js, hosts URL, injects `GEMINI_API_KEY` env var |
| **`.env.local`** | Local dev secrets — never committed |

**Deploy flow:** Push to GitHub → Vercel auto-deploys → live URL updates.

---

## Data flow — cached demo (Path 1)

```text
User clicks "Try: Cruise ship example"
  → Frontend GET /api/demo/cruise-ship
  → Server reads listing-1.json from disk
  → Returns JSON
  → Frontend renders 6 sections
  (no Gemini call)
```

---

## Data flow — live analyze (Path 2)

```text
User pastes text + uploads photo + clicks Analyze
  → Frontend POST /api/analyze { text, images }
  → Server validates inputs
  → Rate limit check (server key)
  → Build prompt + call Gemini with GEMINI_API_KEY
  → Zod validate response
  → Return JSON
  → Frontend renders 6 sections
```

---

## Data flow — BYOK (Path 3)

```text
User hits limit OR expands "Use my API key"
  → User pastes Gemini key
  → Frontend POST /api/analyze { text, images, apiKey }
  → Server validates inputs (skip rate limit)
  → Call Gemini with user's apiKey
  → Zod validate response
  → Return JSON
  → Frontend renders 6 sections
  (user pays inference; your quota untouched)
```

---

## What lives where (file map preview)

```text
app/
  page.tsx                 ← UI: demos + form + results + BYOK
  api/
    analyze/route.ts       ← Live + BYOK path
    demo/[id]/route.ts     ← Cached demos
  data/
    demos/
      cruise-ship.json     ← Cached Listing 1 output
      minimal-listing.json ← Cached Listing 2 output
  lib/
    prompts/system.ts      ← System prompt
    schema/analysis.ts     ← Zod schema
    gemini/client.ts       ← Gemini API wrapper
    rate-limit.ts          ← Rate limiting (server key only)
  .env.local               ← GEMINI_API_KEY (not in git)
  .env.example             ← GEMINI_API_KEY= placeholder
```

---

## Build phases mapped to components

| Phase | Components touched |
| --- | --- |
| **0 Setup** | Repo, env vars, folder structure |
| **1 Prompt lab** | System prompt, Gemini, schema — save demo JSON |
| **2 API** | `/api/analyze`, `/api/demo`, Zod, rate limit, BYOK |
| **3 UI** | Frontend renderer, demo cards, BYOK form |
| **4 Evals** | Compare live vs cached vs expected |
| **5 Deploy** | Vercel, GitHub, env vars |

---

## Quiz yourself before Phase 0

1. Why can't the frontend call Gemini directly?
2. Why are cached demos the **default** UX?
3. What happens when rate limit is hit?
4. Where does the system prompt live, and why?
5. What is Zod for if the prompt already asks for JSON?

Reply with your answers (short is fine). When you pass, we start Phase 0.

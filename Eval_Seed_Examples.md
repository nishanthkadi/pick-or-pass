# Eval Seed Examples

> **Canonical data:** [`eval/dataset.jsonl`](eval/dataset.jsonl)  
> **Golden outputs:** [`eval/golden/`](eval/golden/)  
> **Run evals:** `npm run eval` from `app/`

Human-readable summaries of the eval dataset. Edit `eval/dataset.jsonl` first, then update this file if needed.

## Example 1 — Peppa Pig Cruise Ship (`listing-1`)

**Description:** Colorful Peppa Pig cruise ship playset includes three character figures and various beach-themed accessories. Plastic ship has multiple levels, bunk beds, and a fold-out side panel revealing a ball pit scene. Set comes with a slide, lounge chairs, a table, and a pool.

**Photo signal:** Real home setting (not Amazon stock). Good quality. Items match description. Used-like-new condition appears plausible.

**Expected grade:** Good

**Why this grade:** Text and photo align with specific product details; real home photo; trip justified with standard confirmation questions.

**Visit summary must convey:** Worth a trip if seller confirms completeness and condition first

**Must not include:** hype language; proximity as signal; absolute commands

**Expected reasons:**
- Description matches visible items in photo
- Photo quality is high enough to assess what's included
- Photo looks like a real seller photo, not a stock image
- Description is specific, not fluffy

**Expected seller questions (even for Good):**
- Original retail price / brand / model?
- When was it purchased?
- Any issues to flag before I drive?
- Still available?
- Is this the complete set?

---

## Example 2 — Peppa Pig House (Minimal Text) (`listing-2`)

**Description:** Comes with extra characters and vehicles. Meet up in 95123.

**Photo signal:** Genuine-looking Peppa Pig playset photo, multiple items visible, but sparse text.

**Expected grade:** Not sure (v1 — no profile/ratings access)

**Why this grade:** Photo looks real but text is too sparse for Good; missing price, brand clarity, completeness per v1 rules.

**Visit summary must convey:** Don't drive yet — ask seller about completeness, price, and product details first

**Must not include:** proximity as positive signal; grading as Good despite sparse text; hype language

**Expected reasons:**
- Too little text: no brand clarity, dimensions, or age range
- Photo quality is good and suggests a real listing
- Cannot confirm completeness or condition details from text
- Missing price context for trip-worthiness

**Expected seller questions:**
- Original listing / price / brand?
- When was it bought?
- Any issues before I drive?
- Still available? Full set?
- Age range and safety for a toddler?

**Note:** User might still drive if close by — product should not treat proximity as a signal in v1 (not in inputs). Grade stays Not sure; user applies their own context.

---

## Example 3 — Minnie Mouse Kitchen (Incomplete Set) (`listing-3`)

**Description:** Used-Good Minnie Mouse toy kitchen. Best offer only (no listed price). Seller discloses missing interior trays, no food or box toys. Dimensions ~18" H x 13.5" W x 6.5" D. Blunt seller tone ("don't ask or will be ignored"). Three listing photos.

**Photo signal:** Photos 1–2 are real home shots with doors open; many accessories missing. Photo 3 looks like retail/Amazon-style with full accessories and toy food — not what is actually for sale.

**Expected grade:** Avoid

**Why this grade:** Comparing promo/retail image to actual photos shows far too many missing accessories — enough to make the toy much less fun, not just a missing tray or two. Best-offer-only with no price is too much hassle; easier to find another toy.

**Visit summary must convey:** Skip this trip — too many missing parts and best-offer pricing not worth your time

**Must not include:** proximity as signal; hype language; grading as Good despite incomplete set

**Expected reasons:**
- Many accessories missing vs retail/promo photo — not just a few
- Incomplete set makes toy much less usable or fun
- Best offer with no listed price is too much hassle
- Age range "all ages" is inaccurate
- Actual photos show empty compartments and missing trays

**Expected seller questions:**
- What is your price for this?
- Any damage or missing parts beyond the trays?
- Is there anything else you can sell along with this?

**Note:** Seller language is slightly rude but also no-BS (neutral on tone). Dimension details in multiple forms are helpful. UI demo backlog after eval pass.

---

## Example 4 — Interactive Farm Barn (`listing-4`)

**Description:** Used-Good interactive farm playset — red barn with working lights. Includes chicken, pink mouse, sheep, purple horse, green cow, pink rabbit. Three real home photos from multiple angles.

**Photo signal:** Real home photos, not stock. Animals and colors match text across angles. Lights/interactive features not demonstrated on in photos.

**Expected grade:** Not sure (leaning Good)

**Why this grade:** Strong text-photo match and listing effort, but no price, unknown usage length, completeness unconfirmed, and can't verify interactive features work from photos alone.

**Visit summary must convey:** Ask about price, completeness, usage, and working features before you drive

**Expected reasons:**
- Text and photos match with specific animal details
- Real multi-angle home photos
- Condition labeled used-good but limited usage history
- No price or retail context
- Interactive or lights not verified in photos

**Expected seller questions:**
- How long has this been used?
- Are any components missing?
- What is the interactive part — is everything working?

**Note:** Do not grade on fun or value without price. Color-specific details may be LLM-assisted; still a positive listing signal.

---

## Example 5 — Robud Workbench (Like New + Amazon Screenshot) (`listing-5`)

**Description:** Used-like-new Robud wooden workbench. Seller thinks all pieces included; kids never really used it. Two photos: real home shot + Amazon product page screenshot with $66.99 price.

**Photo signal:** Real home photo shows like-new workbench with believable setting and scale. Second photo is Amazon listing screenshot with retail price and full product details.

**Expected grade:** Good

**Why this grade:** Strong text-photo match; seller pairs authentic photo with Amazon screenshot for price and specs. Brief text is enough because retail context fills the gaps. Straightforward, trip-worthy listing.

**Visit summary must convey:** Worth a trip if you confirm price, completeness, and condition first

**Expected seller questions:**
- Will you bargain on price?
- Why are you selling this?
- What age is this toy good for?
- Do you have a link to the original listing?

**Note:** Brief seller text + retail screenshot is a positive pattern (not the same as sparse text with no price).

---

## Example 6 — Toy Shopping Cart (Broken Base) (`listing-6`)

**Description:** Fair condition. Clean. Single real home photo of a pink/purple toy shopping cart.

**Photo signal:** Teal plastic base shows a large white stress mark and vertical crack between the wheels — looks structurally compromised or snapped at the bottom.

**Expected grade:** Avoid

**Why this grade:** Text says fair and clean, but the photo shows obvious base damage that would affect stability. Not worth a trip; at most ask for address or whether they'd give it away free.

**Visit summary must convey:** Skip this trip — visible structural damage at the base makes it not worth driving for

**Expected seller questions (minimal — not worth negotiating):**
- What is your address for pickup?
- Would you consider giving this away for free given the damage?
- Is pickup only or would you drop off if it is free?

**First eval:** PASS (after prompt tweak — model now returns Avoid)

---

## ChatGPT gaps this product should beat

See also [`eval/README.md`](eval/README.md).

- Requires re-guidance every session on what matters (price, quality, safety, trip-worthiness)
- No persistent parent + Marketplace + toy context
- Unstructured back-and-forth instead of consistent Good / Not sure / Avoid output

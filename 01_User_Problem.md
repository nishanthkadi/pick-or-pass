# User Problem

## Target User

Parent buying second-hand toys for children ages 3–10 on Facebook Marketplace.

## Situation

When browsing Marketplace listings, the parent finds a toy that looks promising from the title, description, and photos. They must decide whether to drive to meet the seller — sometimes after paying a small deposit to hold the item.

## Current Workaround

- Paste listing text into ChatGPT and ask for an opinion (requires re-explaining priorities each time)
- Discuss with a partner
- Inspect seller profile, ratings, and other listings manually
- Reverse image search to estimate retail price
- Drive to the meetup and hope reality matches expectations

## Pain

- Wasted trip when the toy does not match expectations (condition, completeness, age fit, cleanliness)
- Time and cost of driving, especially with kids
- Deposit lost to a scam or misrepresented listing
- In extreme cases, safety concerns about the meetup location or seller
- Listing text can be vague, fluffy, or LLM-written — hard to trust without photos

## Frequency

Recurring whenever actively shopping for used toys on Marketplace (often multiple times per buying cycle).

## Severity

- **Common:** 30–60 minutes wasted on a bad trip
- **Medium:** Deposit lost ($10–50+)
- **Rare but serious:** unsafe meetup or giving child an unsafe/inappropriate toy

## Evidence

- Personal experience as a parent buyer on Facebook Marketplace
- Anchor eval examples in `Eval_Seed_Examples.md`
- Existing workaround: paste into ChatGPT proves demand for structured pre-trip analysis

## Problem Statement

For parents buying second-hand toys (ages 3–10) on Facebook Marketplace, deciding whether to drive to a meetup creates wasted time, deposit risk, and expectation mismatch, because listing text alone is easy to game and photos are hard to interpret consistently without a structured checklist.

A better solution would analyze **listing text plus at least one photo** and return a visit-worthiness grade (Good / Not sure / Avoid), clear reasons, and specific questions to ask the seller before committing to the trip.

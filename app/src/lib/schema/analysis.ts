import { z } from "zod";
import { FUTURE_CAPABILITY_NOTE } from "@/lib/prompts/system";

export const mismatchSchema = z.object({
  issue: z.string(),
  sources: z.array(z.enum(["text", "photo"])),
});

export const reasonSchema = z.object({
  text: z.string(),
  source: z.enum(["text", "photo", "text_and_photo"]),
  sentiment: z.enum(["positive", "neutral", "concern"]),
});

export const analysisSchema = z.object({
  grade: z.enum(["good", "not_sure", "avoid"]),
  grade_label: z.enum(["Good", "Not sure", "Avoid"]),
  visit_summary: z.string(),
  text_photo_alignment: z.enum([
    "matches",
    "partially_matches",
    "contradicts",
    "insufficient_text",
  ]),
  alignment_summary: z.string(),
  mismatches: z.array(mismatchSchema),
  reasons: z.array(reasonSchema).min(1).max(5),
  seller_questions: z.array(z.string()).min(1).max(6),
  seller_message_draft: z.string(),
  limitations: z.array(z.string()).min(3).max(5),
  research_recommended: z.array(z.string()).min(2).max(4),
  future_capability_note: z.string(),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

const DEFAULT_RESEARCH_RECOMMENDED = [
  "Check for product recalls on this toy model or brand.",
  "Compare the listed price to similar used listings in your area.",
];

/** Coerce common Gemini omissions before Zod validation. */
export function normalizeAnalysisPayload(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;

  const obj = { ...(parsed as Record<string, unknown>) };

  if (
    typeof obj.future_capability_note !== "string" ||
    !obj.future_capability_note.trim()
  ) {
    obj.future_capability_note = FUTURE_CAPABILITY_NOTE;
  }

  const research = obj.research_recommended;
  if (!Array.isArray(research) || research.filter((r) => typeof r === "string").length < 2) {
    const limitations = Array.isArray(obj.limitations)
      ? obj.limitations.filter((item): item is string => typeof item === "string")
      : [];
    const derived = limitations
      .slice(0, 3)
      .map((item) => `Research before you go: ${item}`);
    const combined = [...derived, ...DEFAULT_RESEARCH_RECOMMENDED];
    obj.research_recommended = [...new Set(combined)].slice(0, 4);
  }

  return obj;
}

export function parseAnalysisResponse(raw: string): AnalysisResult {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  const parsed = JSON.parse(cleaned) as unknown;
  return analysisSchema.parse(normalizeAnalysisPayload(parsed));
}

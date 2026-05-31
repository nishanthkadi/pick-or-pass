import { z } from "zod";

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

export function parseAnalysisResponse(raw: string): AnalysisResult {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  const parsed = JSON.parse(cleaned) as unknown;
  return analysisSchema.parse(parsed);
}

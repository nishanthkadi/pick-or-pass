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

  // Normalize grade / grade_label pair
  if (typeof obj.grade === "string") {
    const g = obj.grade.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (g === "good" || g === "not_sure" || g === "avoid") {
      obj.grade = g;
    } else if (g === "notsure" || g === "unsure") {
      obj.grade = "not_sure";
    }
  }
  const grade =
    obj.grade === "good" || obj.grade === "not_sure" || obj.grade === "avoid"
      ? obj.grade
      : "not_sure";
  obj.grade = grade;

  const labelMap = {
    good: "Good",
    not_sure: "Not sure",
    avoid: "Avoid",
  } as const;
  if (typeof obj.grade_label !== "string" || !obj.grade_label.trim()) {
    obj.grade_label = labelMap[grade];
  }

  if (typeof obj.visit_summary !== "string" || !obj.visit_summary.trim()) {
    // Accept common aliases the model may emit
    const alias =
      (typeof obj.summary === "string" && obj.summary) ||
      (typeof obj.visitSummary === "string" && obj.visitSummary) ||
      (typeof obj.verdict_summary === "string" && obj.verdict_summary) ||
      "";
    obj.visit_summary = alias.trim()
      ? alias.trim()
      : grade === "avoid"
        ? "Skip this trip — listing issues make it not worth your time."
        : grade === "good"
          ? "Worth a trip if you confirm key details with the seller first."
          : "Don't drive yet — ask the seller about key gaps before committing.";
  }

  const VALID_ALIGNMENTS = new Set([
    "matches",
    "partially_matches",
    "contradicts",
    "insufficient_text",
  ]);

  // Coerce common alignment misspellings / synonyms from the model
  if (typeof obj.text_photo_alignment === "string") {
    const alignment = obj.text_photo_alignment
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    const alignmentMap: Record<string, string> = {
      match: "matches",
      matching: "matches",
      aligned: "matches",
      consistent: "matches",
      text_photo_match: "matches",
      partial: "partially_matches",
      partially_match: "partially_matches",
      partial_match: "partially_matches",
      partial_matches: "partially_matches",
      some_match: "partially_matches",
      contradiction: "contradicts",
      contradict: "contradicts",
      conflicting: "contradicts",
      mismatched: "contradicts",
      mismatch: "contradicts",
      does_not_match: "contradicts",
      insufficient: "insufficient_text",
      sparse_text: "insufficient_text",
      sparse: "insufficient_text",
      missing_text: "insufficient_text",
      weak_text: "insufficient_text",
    };
    obj.text_photo_alignment = alignmentMap[alignment] ?? alignment;
  }

  if (
    typeof obj.text_photo_alignment !== "string" ||
    !VALID_ALIGNMENTS.has(obj.text_photo_alignment)
  ) {
    const g =
      obj.grade === "good" || obj.grade === "not_sure" || obj.grade === "avoid"
        ? obj.grade
        : "not_sure";
    obj.text_photo_alignment =
      g === "avoid"
        ? "contradicts"
        : g === "good"
          ? "matches"
          : "insufficient_text";
  }

  // Policy bindings the model often drifts on
  if (obj.text_photo_alignment === "contradicts") {
    obj.grade = "avoid";
    obj.grade_label = "Avoid";
  } else if (
    obj.text_photo_alignment === "insufficient_text" &&
    obj.grade === "good"
  ) {
    obj.grade = "not_sure";
    obj.grade_label = "Not sure";
  }

  // Keep visit_summary template-ish if grade was coerced
  if (
    obj.grade === "avoid" &&
    typeof obj.visit_summary === "string" &&
    /worth a trip|don'?t drive yet/i.test(obj.visit_summary)
  ) {
    obj.visit_summary =
      "Skip this trip — listing issues make it not worth your time.";
  }
  if (
    obj.grade === "not_sure" &&
    typeof obj.visit_summary === "string" &&
    /worth a trip/i.test(obj.visit_summary)
  ) {
    obj.visit_summary =
      "Don't drive yet — ask the seller about key gaps before committing.";
  }

  if (typeof obj.alignment_summary !== "string" || !obj.alignment_summary.trim()) {
    const grade = typeof obj.grade === "string" ? obj.grade : "not_sure";
    obj.alignment_summary =
      grade === "avoid"
        ? "Photo and text together raise trip-worthiness concerns."
        : grade === "good"
          ? "Listing text and photos are consistent enough to justify a careful trip."
          : "Listing materials leave key gaps that should be resolved before driving.";
  }

  if (!Array.isArray(obj.mismatches)) {
    obj.mismatches = [];
  } else {
    obj.mismatches = obj.mismatches.map((item) => {
      if (!item || typeof item !== "object") return item;
      const mismatch = { ...(item as Record<string, unknown>) };
      if (Array.isArray(mismatch.sources)) {
        mismatch.sources = mismatch.sources
          .flatMap((src) => {
            const s = String(src).trim().toLowerCase().replace(/[\s-]+/g, "_");
            if (s === "text" || s === "listing" || s === "description") return ["text"];
            if (s === "photo" || s === "image" || s === "photos") return ["photo"];
            if (s === "text_and_photo" || s === "both" || s === "text_photo") {
              return ["text", "photo"];
            }
            return [];
          })
          .filter((v, i, arr) => arr.indexOf(v) === i);
        if ((mismatch.sources as string[]).length === 0) {
          mismatch.sources = ["photo"];
        }
      } else {
        mismatch.sources = ["photo"];
      }
      return mismatch;
    });
  }

  if (Array.isArray(obj.reasons)) {
    obj.reasons = obj.reasons.map((item) => {
      if (!item || typeof item !== "object") return item;
      const reason = { ...(item as Record<string, unknown>) };
      if (typeof reason.source === "string") {
        const s = reason.source.trim().toLowerCase().replace(/[\s-]+/g, "_");
        const sourceMap: Record<string, string> = {
          text: "text",
          listing: "text",
          description: "text",
          photo: "photo",
          image: "photo",
          photos: "photo",
          text_and_photo: "text_and_photo",
          text_photo: "text_and_photo",
          both: "text_and_photo",
          mixed: "text_and_photo",
        };
        reason.source = sourceMap[s] ?? "text_and_photo";
      } else {
        reason.source = "text_and_photo";
      }
      if (typeof reason.sentiment === "string") {
        const sent = reason.sentiment.trim().toLowerCase();
        if (!["positive", "neutral", "concern"].includes(sent)) {
          reason.sentiment =
            sent.includes("neg") || sent.includes("worry") || sent.includes("risk")
              ? "concern"
              : "neutral";
        }
      }
      return reason;
    });
  }

  const DEFAULT_LIMITATIONS = [
    "Hidden wear or damage not visible in listing photos",
    "Completeness of accessories cannot be fully verified from listing materials",
    "Usage history and how the toy was stored are unknown",
  ];
  if (!Array.isArray(obj.limitations)) {
    obj.limitations = DEFAULT_LIMITATIONS;
  } else {
    const limitations = obj.limitations.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
    while (limitations.length < 3) {
      const next = DEFAULT_LIMITATIONS[limitations.length];
      if (!limitations.includes(next)) limitations.push(next);
      else limitations.push(`Additional unknown #${limitations.length + 1}`);
    }
    obj.limitations = limitations.slice(0, 5);
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

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonSlice =
    start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  const parsed = JSON.parse(jsonSlice) as unknown;
  return analysisSchema.parse(normalizeAnalysisPayload(parsed));
}

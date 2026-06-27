import { z } from "zod";

export const feedbackIssueTagSchema = z.enum([
  "grade_wrong",
  "missed_damage",
  "missed_missing_parts",
  "too_cautious",
  "too_confident",
  "unclear_reasoning",
  "seller_questions_unhelpful",
  "other",
]);

export const feedbackRequestSchema = z.object({
  savedListingId: z.string().uuid().optional(),
  ownerToken: z.string().trim().min(8).max(120),
  helpfulness: z.enum(["helpful", "not_helpful"]),
  gradeAccuracy: z
    .enum(["right", "wrong", "not_sure", "not_contacted"])
    .default("not_contacted"),
  issueTags: z.array(feedbackIssueTagSchema).max(5).default([]),
  comment: z.string().trim().max(700).optional(),
  metadata: z.object({
    source: z.enum(["demo", "analyze"]),
    listingLabel: z.string().trim().max(120).optional(),
    listingDescription: z.string().trim().max(4000).optional(),
    imageCount: z.number().int().min(0).max(10),
    analysis: z.object({
      grade: z.enum(["good", "not_sure", "avoid"]),
      grade_label: z.enum(["Good", "Not sure", "Avoid"]),
      text_photo_alignment: z.enum([
        "matches",
        "partially_matches",
        "contradicts",
        "insufficient_text",
      ]),
      visit_summary: z.string().trim().max(1000),
    }),
  }),
});

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
export type FeedbackIssueTag = z.infer<typeof feedbackIssueTagSchema>;

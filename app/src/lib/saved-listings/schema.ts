import { analysisSchema } from "@/lib/schema/analysis";
import { z } from "zod";

export const savedListingSourceSchema = z.enum(["demo", "analyze"]);

export const reviewStatusSchema = z.enum([
  "not_shared",
  "unreviewed",
  "eval_candidate",
  "added_to_eval",
  "rejected",
]);

export const savedListingPayloadSchema = z.object({
  ownerToken: z.string().trim().min(8).max(120),
  source: savedListingSourceSchema,
  listingText: z.string().trim().max(4000).optional(),
  listingLabel: z.string().trim().max(120).optional(),
  listingImageUrls: z.array(z.string().trim().max(500)).max(10).default([]),
  analysis: analysisSchema,
  userSaved: z.boolean().default(true),
  allowImprovementUse: z.boolean().default(false),
});

export type SavedListingPayload = z.infer<typeof savedListingPayloadSchema>;
export type SavedListingSource = z.infer<typeof savedListingSourceSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

import { buildAnalysisListingTextFromParts } from "@/lib/listing/buildAnalysisListingText";
import type { EvalCase } from "./loadDataset";

export function buildAnalysisListingText(evalCase: EvalCase): string {
  return buildAnalysisListingTextFromParts(
    evalCase.description,
    evalCase.listing_context,
  );
}

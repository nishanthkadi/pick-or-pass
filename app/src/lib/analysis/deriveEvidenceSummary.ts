import type { AnalysisResult } from "@/lib/schema/analysis";

export type EvidenceSummary = {
  confidenceSummary: string;
  seenInPhotos: string[];
  claimedInText: string[];
  unknowns: string[];
  whatWouldChangeVerdict: string[];
  changeVerdictIntro: string;
};

export function deriveConfidenceSummary(result: AnalysisResult): string {
  const { grade, text_photo_alignment } = result;

  if (grade === "avoid") {
    if (text_photo_alignment === "contradicts") {
      return "Confident you should skip — the photo contradicts what the listing claims.";
    }
    return "Confident you should skip — the listing has enough red flags to avoid the trip.";
  }

  if (grade === "not_sure") {
    if (text_photo_alignment === "insufficient_text") {
      return "Low confidence — listing text is too thin to justify a trip yet.";
    }
    if (text_photo_alignment === "partially_matches") {
      return "Moderate confidence only — some details align, but key gaps remain.";
    }
    return "Low to moderate confidence — photos look okay, but missing details block a stronger verdict.";
  }

  if (text_photo_alignment === "matches") {
    return "Fairly confident — text and photos align, though you should still confirm before driving.";
  }

  return "Cautiously positive — worth confirming the main uncertainties with the seller first.";
}

function getChangeVerdictIntro(result: AnalysisResult): string {
  if (result.grade === "good") {
    return "A stronger yes would need answers like:";
  }
  if (result.grade === "avoid") {
    return "This would only change if the seller clarified:";
  }
  return "This could move to Good if the seller confirms:";
}

export function deriveEvidenceSummary(result: AnalysisResult): EvidenceSummary {
  const seenInPhotos = result.reasons
    .filter((r) => r.source === "photo" || r.source === "text_and_photo")
    .map((r) => r.text);

  const claimedInText = result.reasons
    .filter((r) => r.source === "text" || r.source === "text_and_photo")
    .map((r) => r.text);

  return {
    confidenceSummary: deriveConfidenceSummary(result),
    seenInPhotos,
    claimedInText,
    unknowns: result.limitations.slice(0, 4),
    whatWouldChangeVerdict: result.seller_questions.slice(0, 3),
    changeVerdictIntro: getChangeVerdictIntro(result),
  };
}

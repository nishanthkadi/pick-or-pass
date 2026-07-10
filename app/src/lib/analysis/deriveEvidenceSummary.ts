import type { AnalysisResult } from "@/lib/schema/analysis";

export type EvidenceSummary = {
  confidenceSummary: string;
  seenInPhotos: string[];
  claimedInText: string[];
  unknowns: string[];
  verdictChangeSummary: string;
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

function formatThemeList(themes: string[]): string {
  if (themes.length === 1) {
    return themes[0];
  }
  if (themes.length === 2) {
    return `${themes[0]} and ${themes[1]}`;
  }
  return `${themes.slice(0, -1).join(", ")}, and ${themes.at(-1)}`;
}

export function deriveVerdictChangeSummary(result: AnalysisResult): string {
  if (result.grade === "good") {
    return "Already leaning yes — confirming condition and completeness would strengthen confidence.";
  }

  if (result.grade === "avoid") {
    if (result.text_photo_alignment === "contradicts") {
      return "Unlikely to change unless the photo-condition mismatch is resolved.";
    }
    return "Unlikely to change unless the damage or missing parts are explained away.";
  }

  const blob = result.limitations.join(" ").toLowerCase();
  const themes: string[] = [];

  if (/price|cost|\$/.test(blob)) themes.push("price");
  if (/complete|missing|accessories|parts/.test(blob)) themes.push("completeness");
  if (/working|electronic|lights|sounds|interactive|feature/.test(blob)) {
    themes.push("working features");
  }
  if (/damage|condition|clean/.test(blob)) themes.push("condition");
  if (/text|detail|history|usage/.test(blob)) themes.push("listing details");

  if (themes.length === 0) {
    return "This could move to Good once the main unknowns below are confirmed with the seller.";
  }

  return `This could move to Good if ${formatThemeList(themes.slice(0, 3))} are confirmed.`;
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
    verdictChangeSummary: deriveVerdictChangeSummary(result),
  };
}

import type { AnalysisResult } from "@/lib/schema/analysis";
import type { EvalCase } from "./loadDataset";

export type RubricCheck = {
  name: string;
  pass: boolean;
  detail: string;
};

export type EvalScore = {
  id: string;
  grade_match: boolean;
  alignment_match: boolean;
  visit_summary_pass: boolean;
  reason_themes_matched: number;
  reason_themes_total: number;
  seller_questions_matched: number;
  seller_questions_total: number;
  guardrails_pass: boolean;
  guardrail_violations: string[];
  rubric_pass: boolean;
  checks: RubricCheck[];
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "your",
  "before",
  "after",
  "about",
  "seller",
  "listing",
  "trip",
  "drive",
  "first",
  "still",
  "make",
  "must",
  "not",
  "ask",
  "confirm",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

/** Fuzzy match: enough significant words from theme appear in haystack. */
export function themeMatchesHaystack(theme: string, haystack: string): boolean {
  const words = significantWords(theme);
  if (words.length === 0) return false;

  const required = Math.max(1, Math.ceil(words.length * 0.35));
  let hits = 0;
  for (const word of words) {
    if (haystack.includes(word)) hits++;
  }
  return hits >= required;
}

function buildOutputBlob(result: AnalysisResult): string {
  const parts = [
    result.visit_summary,
    result.alignment_summary,
    ...result.reasons.map((r) => r.text),
    ...result.seller_questions,
    result.seller_message_draft,
    ...result.mismatches.map((m) => m.issue),
  ];
  return normalize(parts.join(" "));
}

function scoreVisitSummary(
  result: AnalysisResult,
  mustConvey: string,
): boolean {
  const summary = normalize(result.visit_summary);
  const words = significantWords(mustConvey);
  if (words.length === 0) return true;

  const required = Math.max(2, Math.ceil(words.length * 0.4));
  let hits = 0;
  for (const word of words) {
    if (summary.includes(word)) hits++;
  }
  return hits >= required;
}

function scoreReasonThemes(
  result: AnalysisResult,
  themes: string[],
): { matched: number; total: number } {
  const blob = buildOutputBlob(result);
  let matched = 0;
  for (const theme of themes) {
    if (themeMatchesHaystack(theme, blob)) matched++;
  }
  return { matched, total: themes.length };
}

function scoreSellerQuestions(
  result: AnalysisResult,
  expected: string[],
): { matched: number; total: number } {
  const blob = normalize(
    [...result.seller_questions, result.seller_message_draft].join(" "),
  );
  let matched = 0;
  for (const question of expected) {
    if (themeMatchesHaystack(question, blob)) matched++;
  }
  return { matched, total: expected.length };
}

const GUARDRAIL_PATTERNS: Array<{
  id: string;
  test: (blob: string, result: AnalysisResult) => boolean;
}> = [
  {
    id: "hype language or urgency pressure",
    test: (blob) =>
      /great listing|don t miss|amazing deal|act fast|won t last|must buy/.test(
        blob,
      ),
  },
  {
    id: "absolute commands like avoid at all costs",
    test: (blob) => /avoid at all costs|never buy|do not even consider/.test(blob),
  },
  {
    id: "proximity or meetup location as grading signal",
    test: (blob, result) => {
      const zipOrMeetup =
        /\b\d{5}\b/.test(blob) ||
        /meet up|meetup|close by|nearby|short drive|worth the drive because.*close/.test(
          blob,
        );
      if (!zipOrMeetup) return false;
      const positiveProximity = result.reasons.some(
        (r) =>
          r.sentiment === "positive" &&
          /meet up|meetup|zip|close|nearby|95123|\d{5}/.test(
            normalize(r.text),
          ),
      );
      return positiveProximity;
    },
  },
  {
    id: "proximity or zip code as positive grading signal",
    test: (blob, result) =>
      GUARDRAIL_PATTERNS.find((p) => p.id.includes("proximity"))!.test(
        blob,
        result,
      ),
  },
];

function scoreGuardrails(
  result: AnalysisResult,
  mustNotInclude: string[],
): { pass: boolean; violations: string[] } {
  const blob = buildOutputBlob(result);
  const violations: string[] = [];

  for (const guardrail of mustNotInclude) {
    const normalizedGuard = normalize(guardrail);
    const pattern = GUARDRAIL_PATTERNS.find(
      (p) => normalize(p.id) === normalizedGuard || guardrail.includes(p.id),
    );

    if (pattern?.test(blob, result)) {
      violations.push(guardrail);
      continue;
    }

    if (/grading as good despite sparse text/.test(normalizedGuard)) {
      if (result.grade === "good" && result.text_photo_alignment === "insufficient_text") {
        violations.push(guardrail);
      }
    }

    if (/grading as avoid despite strong listing materials/.test(normalizedGuard)) {
      if (result.grade === "avoid" && result.text_photo_alignment === "matches") {
        const hasStrongPositive = result.reasons.filter(
          (r) => r.sentiment === "positive",
        ).length >= 3;
        if (hasStrongPositive) violations.push(guardrail);
      }
    }

    if (/grading as good or not sure despite visible structural damage/.test(normalizedGuard)) {
      if (result.grade !== "avoid") {
        const damageMention = /crack|break|split|stress|structural|snapped|damage/.test(
          blob,
        );
        if (damageMention) violations.push(guardrail);
      }
    }
  }

  return { pass: violations.length === 0, violations };
}

const GAP_KEYWORDS =
  /price|completeness|complete set|sparse|missing|feature|interactive|electronic|working|usage|hidden|damage|unknown|confirm|verify|thin|vague|gap/i;

function scoreCalibration(
  evalCase: EvalCase,
  result: AnalysisResult,
): RubricCheck[] {
  const checks: RubricCheck[] = [];

  if (result.grade === "not_sure") {
    const gapBlob = [
      ...result.limitations,
      ...result.reasons
        .filter((r) => r.sentiment === "concern" || r.sentiment === "neutral")
        .map((r) => r.text),
    ].join(" ");

    const explainsGap = GAP_KEYWORDS.test(gapBlob);
    checks.push({
      name: "calibration_not_sure_gap",
      pass: explainsGap,
      detail: explainsGap
        ? "not_sure explains a concrete gap"
        : "not_sure missing a clear gap in reasons or limitations",
    });
  }

  const hasDamageTag = evalCase.tags.some((tag) =>
    /damage|structural|crack|incomplete/.test(tag),
  );
  if (result.grade === "avoid" && hasDamageTag) {
    const hasPhotoReason = result.reasons.some(
      (r) => r.source === "photo" || r.source === "text_and_photo",
    );
    checks.push({
      name: "calibration_avoid_photo_evidence",
      pass: hasPhotoReason,
      detail: hasPhotoReason
        ? "avoid case cites photo evidence"
        : "avoid/damage case should include a photo-sourced reason",
    });
  }

  const allTextReasons =
    result.reasons.length > 0 &&
    result.reasons.every((r) => r.source === "text");
  checks.push({
    name: "calibration_multimodal_sources",
    pass: !allTextReasons,
    detail: allTextReasons
      ? "all reasons tagged text-only on a multimodal case"
      : "uses photo or mixed sources in reasons",
  });

  const ctx = evalCase.listing_context;
  if (ctx?.listed_price_usd != null) {
    const priceBlob = [
      result.visit_summary,
      ...result.reasons.map((r) => r.text),
    ].join(" ");
    const normalizedBlob = normalize(priceBlob);
    const priceStr = String(ctx.listed_price_usd);
    const mentionsPrice =
      normalizedBlob.includes(priceStr) ||
      /\b(dollar|dollars|price|value|cheap|affordable|low cost)\b/.test(
        normalizedBlob,
      );
    checks.push({
      name: "calibration_price_signal_used",
      pass: mentionsPrice,
      detail: mentionsPrice
        ? `output references listed price ($${ctx.listed_price_usd}) or value`
        : `expected output to use listed price ($${ctx.listed_price_usd}) in reasons or visit_summary`,
    });

    const listingPrices = new Set(
      (evalCase.description.match(/\$\d+(?:\.\d{1,2})?/g) ?? []).map((p) =>
        p.replace("$", ""),
      ),
    );
    listingPrices.add(String(ctx.listed_price_usd));

    const reasonPrices =
      result.reasons
        .map((r) => r.text.match(/\$(\d+(?:\.\d{1,2})?)/g) ?? [])
        .flat()
        .map((p) => p.replace("$", "")) ?? [];

    const inventedRetail = reasonPrices.some((p) => !listingPrices.has(p));
    checks.push({
      name: "calibration_no_invented_retail",
      pass: !inventedRetail,
      detail: inventedRetail
        ? "reasons cite dollar amounts not present in listing materials"
        : "no invented retail prices in reasons",
    });
  }

  if (ctx?.seller_star_rating != null) {
    const trustBlob = [
      result.visit_summary,
      ...result.reasons.map((r) => r.text),
    ].join(" ");
    const normalizedTrust = normalize(trustBlob);
    const ratingStr = String(ctx.seller_star_rating);
    const mentionsTrust =
      /\b(rated|rating|stars|seller|trust|reputation|highly rated)\b/.test(
        normalizedTrust,
      ) || normalizedTrust.includes(ratingStr.replace(".", ""));
    checks.push({
      name: "calibration_seller_rating_used",
      pass: mentionsTrust,
      detail: mentionsTrust
        ? `output references seller trust or rating (${ctx.seller_star_rating}/5)`
        : `expected output to use seller star rating (${ctx.seller_star_rating}/5) in reasons or visit_summary`,
    });
  }

  return checks;
}

export function scoreEvalRun(
  evalCase: EvalCase,
  result: AnalysisResult,
): EvalScore {
  const gradeMatch = result.grade === evalCase.expected.grade;
  const alignmentMatch =
    result.text_photo_alignment === evalCase.expected.text_photo_alignment;

  const visitSummaryPass = scoreVisitSummary(
    result,
    evalCase.expected.visit_summary_must_convey,
  );

  const reasonThemes = scoreReasonThemes(
    result,
    evalCase.expected.must_include_reason_themes,
  );

  const sellerQuestions = scoreSellerQuestions(
    result,
    evalCase.expected.should_ask_seller,
  );

  const guardrails = scoreGuardrails(
    result,
    evalCase.expected.must_not_include,
  );

  const reasonThemesPass =
    reasonThemes.matched >= Math.ceil(reasonThemes.total * 0.6);
  const sellerQuestionsPass =
    sellerQuestions.matched >= Math.ceil(sellerQuestions.total * 0.5);

  const checks: RubricCheck[] = [
    {
      name: "grade",
      pass: gradeMatch,
      detail: `expected ${evalCase.expected.grade}, got ${result.grade}`,
    },
    {
      name: "alignment",
      pass: alignmentMatch,
      detail: `expected ${evalCase.expected.text_photo_alignment}, got ${result.text_photo_alignment}`,
    },
    {
      name: "visit_summary",
      pass: visitSummaryPass,
      detail: visitSummaryPass
        ? "conveys expected trip framing"
        : `expected: "${evalCase.expected.visit_summary_must_convey.slice(0, 60)}…"`,
    },
    {
      name: "reason_themes",
      pass: reasonThemesPass,
      detail: `${reasonThemes.matched}/${reasonThemes.total} themes`,
    },
    {
      name: "seller_questions",
      pass: sellerQuestionsPass,
      detail: `${sellerQuestions.matched}/${sellerQuestions.total} questions`,
    },
    {
      name: "guardrails",
      pass: guardrails.pass,
      detail: guardrails.pass
        ? "no violations"
        : guardrails.violations.join("; "),
    },
    ...scoreCalibration(evalCase, result),
  ];

  const rubricPass = checks.every((c) => c.pass);

  return {
    id: evalCase.id,
    grade_match: gradeMatch,
    alignment_match: alignmentMatch,
    visit_summary_pass: visitSummaryPass,
    reason_themes_matched: reasonThemes.matched,
    reason_themes_total: reasonThemes.total,
    seller_questions_matched: sellerQuestions.matched,
    seller_questions_total: sellerQuestions.total,
    guardrails_pass: guardrails.pass,
    guardrail_violations: guardrails.violations,
    rubric_pass: rubricPass,
    checks,
  };
}

export function formatScoreRow(score: EvalScore): string {
  const grade = score.grade_match ? "✓" : "✗";
  const align = score.alignment_match ? "✓" : "✗";
  const visit = score.visit_summary_pass ? "✓" : "✗";
  const themes = `${score.reason_themes_matched}/${score.reason_themes_total}`;
  const questions = `${score.seller_questions_matched}/${score.seller_questions_total}`;
  const guard = score.guardrails_pass ? "✓" : "✗";
  const overall = score.rubric_pass ? "PASS" : "FAIL";

  return `${score.id.padEnd(12)} ${grade}  ${align}  ${visit}  ${themes.padStart(5)}  ${questions.padStart(5)}  ${guard}  ${overall}`;
}

export function printScoreSummary(scores: EvalScore[]): void {
  console.log("\nRubric summary:");
  console.log(
    "id           grade  align  visit  themes  questions  guard  overall",
  );
  console.log("-".repeat(72));
  for (const score of scores) {
    console.log(formatScoreRow(score));
  }
  const passed = scores.filter((s) => s.rubric_pass).length;
  console.log(`\nRubric: ${passed}/${scores.length} full pass`);
  const gradePassed = scores.filter((s) => s.grade_match).length;
  console.log(`Grade only: ${gradePassed}/${scores.length} match`);
}

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const textPhotoAlignmentSchema = z.enum([
  "matches",
  "partially_matches",
  "contradicts",
  "insufficient_text",
]);

export const EVAL_FIELD_LIMITS = {
  tags: { min: 1, max: 8 },
  reasonThemes: { min: 3, max: 6, itemMin: 8 },
  sellerQuestions: { min: 3, max: 6, itemMin: 5 },
  mustNotInclude: { min: 2, max: 5, itemMin: 5 },
  photoSignalMin: 20,
  whyGradeMin: 20,
  visitSummaryMin: 15,
  descriptionMin: 10,
} as const;

export const GUARDRAIL_SUGGESTIONS = [
  "hype language or urgency pressure",
  "proximity or meetup location as grading signal",
  "absolute commands like avoid at all costs",
  "unverified safety claims about neighborhood or seller",
  "invasive personal questions",
  "exact retail price or recall claims without listing evidence",
] as const;

export const evalCaseSchema = z.object({
  id: z.string(),
  description: z.string().min(EVAL_FIELD_LIMITS.descriptionMin),
  image_files: z.array(z.string()).min(1),
  image_dir: z.string().default("assets"),
  tags: z
    .array(z.string().min(2))
    .min(EVAL_FIELD_LIMITS.tags.min)
    .max(EVAL_FIELD_LIMITS.tags.max),
  expected: z.object({
    grade: z.enum(["good", "not_sure", "avoid"]),
    text_photo_alignment: textPhotoAlignmentSchema,
    visit_summary_must_convey: z.string().min(EVAL_FIELD_LIMITS.visitSummaryMin),
    must_include_reason_themes: z
      .array(z.string().min(EVAL_FIELD_LIMITS.reasonThemes.itemMin))
      .min(EVAL_FIELD_LIMITS.reasonThemes.min)
      .max(EVAL_FIELD_LIMITS.reasonThemes.max),
    should_ask_seller: z
      .array(z.string().min(EVAL_FIELD_LIMITS.sellerQuestions.itemMin))
      .min(EVAL_FIELD_LIMITS.sellerQuestions.min)
      .max(EVAL_FIELD_LIMITS.sellerQuestions.max),
    must_not_include: z
      .array(z.string().min(EVAL_FIELD_LIMITS.mustNotInclude.itemMin))
      .min(EVAL_FIELD_LIMITS.mustNotInclude.min)
      .max(EVAL_FIELD_LIMITS.mustNotInclude.max),
  }),
  notes: z.object({
    photo_signal: z.string().min(EVAL_FIELD_LIMITS.photoSignalMin),
    why_this_grade: z.string().min(EVAL_FIELD_LIMITS.whyGradeMin),
    pm_note: z.string().nullable().optional(),
  }),
  rag_expectations: z
    .object({
      should_retrieve_topics: z.array(z.string()).default([]),
      must_not_cite: z.array(z.string()).default([]),
    })
    .default({ should_retrieve_topics: [], must_not_cite: [] }),
  golden_output_path: z.string().optional(),
  use_as_cached_demo: z.boolean().default(false),
  demo_output_path: z.string().optional(),
});
export type EvalCase = z.infer<typeof evalCaseSchema>;
export type EvalCaseInput = z.input<typeof evalCaseSchema>;

export const EVAL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const DEFAULT_DATASET = path.join("eval", "dataset.jsonl");
const DEFAULT_IMAGE_DIR = "assets";
const DEFAULT_DEMO_DIR = "app/src/data/demos";

export function fillEvalCaseDefaults(input: EvalCaseInput): EvalCase {
  const useAsDemo = input.use_as_cached_demo ?? true;
  const id = input.id;

  return evalCaseSchema.parse({
    image_dir: DEFAULT_IMAGE_DIR,
    rag_expectations: { should_retrieve_topics: [], must_not_cite: [] },
    use_as_cached_demo: useAsDemo,
    golden_output_path: `golden/${id}.json`,
    ...(useAsDemo ? { demo_output_path: `${DEFAULT_DEMO_DIR}/${id}.json` } : {}),
    ...input,
  });
}

function collectRubricErrors(input: EvalCaseInput): string[] {
  const errors: string[] = [];
  const { expected, notes, tags } = input;

  if (!tags?.length) {
    errors.push(
      `tags: at least ${EVAL_FIELD_LIMITS.tags.min} required (e.g. sparse_text, peppa_pig)`,
    );
  }

  if (!expected?.text_photo_alignment) {
    errors.push(
      "expected.text_photo_alignment is required (matches | partially_matches | contradicts | insufficient_text)",
    );
  }

  if (!expected?.visit_summary_must_convey?.trim()) {
    errors.push(
      `expected.visit_summary_must_convey is required (min ${EVAL_FIELD_LIMITS.visitSummaryMin} chars) — what should visit_summary communicate?`,
    );
  }

  const reasonCount = expected?.must_include_reason_themes?.length ?? 0;
  if (reasonCount < EVAL_FIELD_LIMITS.reasonThemes.min) {
    errors.push(
      `expected.must_include_reason_themes: need ${EVAL_FIELD_LIMITS.reasonThemes.min}-${EVAL_FIELD_LIMITS.reasonThemes.max} reason themes (have ${reasonCount})`,
    );
  }

  const sellerCount = expected?.should_ask_seller?.length ?? 0;
  if (sellerCount < EVAL_FIELD_LIMITS.sellerQuestions.min) {
    errors.push(
      `expected.should_ask_seller: need ${EVAL_FIELD_LIMITS.sellerQuestions.min}-${EVAL_FIELD_LIMITS.sellerQuestions.max} questions (have ${sellerCount})`,
    );
  }

  const guardCount = expected?.must_not_include?.length ?? 0;
  if (guardCount < EVAL_FIELD_LIMITS.mustNotInclude.min) {
    errors.push(
      `expected.must_not_include: need ${EVAL_FIELD_LIMITS.mustNotInclude.min}-${EVAL_FIELD_LIMITS.mustNotInclude.max} guardrails the output must avoid (have ${guardCount})`,
    );
  }

  if (!notes?.photo_signal?.trim()) {
    errors.push(
      `notes.photo_signal is required (min ${EVAL_FIELD_LIMITS.photoSignalMin} chars) — describe what the photo shows`,
    );
  }

  if (!notes?.why_this_grade?.trim()) {
    errors.push(
      `notes.why_this_grade is required (min ${EVAL_FIELD_LIMITS.whyGradeMin} chars) — PM rationale for the expected grade`,
    );
  }

  return errors;
}
export type EvalCaseValidationResult =
  | { ok: true; evalCase: EvalCase }
  | { ok: false; errors: string[] };

export function validateNewEvalCase(
  input: EvalCaseInput,
  projectRoot: string,
  options?: { allowExistingId?: boolean },
): EvalCaseValidationResult {
  const errors: string[] = [];

  if (!input.id?.trim()) {
    errors.push("id is required");
  } else if (!EVAL_ID_PATTERN.test(input.id)) {
    errors.push(
      "id must be lowercase letters, numbers, and hyphens (e.g. stock-photo)",
    );
  } else if (!options?.allowExistingId) {
    const existing = loadEvalDataset({ projectRoot });
    if (existing.some((c) => c.id === input.id)) {
      errors.push(`id "${input.id}" already exists in dataset.jsonl`);
    }
  }

  if (!input.description?.trim()) {
    errors.push("description is required (listing text)");
  } else if (input.description.trim().length < 10) {
    errors.push("description should be at least 10 characters");
  }

  if (!input.image_files?.length) {
    errors.push("at least one image file is required");
  }

  if (!input.expected?.grade) {
    errors.push("expected.grade is required (good | not_sure | avoid)");
  }

  errors.push(...collectRubricErrors(input));

  let evalCase: EvalCase | undefined;
  if (errors.length === 0 && input.id) {
    try {
      evalCase = fillEvalCaseDefaults(input);
    } catch (err) {
      errors.push(`schema validation failed: ${err}`);
    }
  }

  if (evalCase) {
    const imageDir = path.join(projectRoot, evalCase.image_dir);
    for (const file of evalCase.image_files) {
      const imagePath = path.join(imageDir, file);
      if (!fs.existsSync(imagePath)) {
        errors.push(`image not found: ${imagePath}`);
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, evalCase: evalCase! };
}

export function registerEvalCase(
  input: EvalCaseInput,
  projectRoot: string,
  options?: { dryRun?: boolean; allowExistingId?: boolean },
): EvalCaseValidationResult {
  const result = validateNewEvalCase(input, projectRoot, options);
  if (!result.ok || options?.dryRun) {
    return result;
  }

  const datasetPath = path.join(projectRoot, DEFAULT_DATASET);
  const line = JSON.stringify(result.evalCase) + "\n";
  fs.appendFileSync(datasetPath, line);

  return result;
}

export function getProjectRoot(fromAppCwd: string): string {
  return path.join(fromAppCwd, "..");
}

export function loadEvalDataset(options?: {
  projectRoot?: string;
}): EvalCase[] {
  const projectRoot =
    options?.projectRoot ?? getProjectRoot(process.cwd());
  const datasetPath = path.join(projectRoot, DEFAULT_DATASET);

  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Eval dataset not found: ${datasetPath}`);
  }

  const lines = fs
    .readFileSync(datasetPath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    try {
      const parsed = JSON.parse(line) as unknown;
      return evalCaseSchema.parse(parsed);
    } catch (err) {
      throw new Error(
        `Invalid eval case on line ${index + 1} of dataset.jsonl: ${err}`,
      );
    }
  });
}

export function getEvalCaseById(
  id: string,
  options?: { projectRoot?: string },
): EvalCase | undefined {
  return loadEvalDataset(options).find((c) => c.id === id);
}

export function resolveImagePaths(
  evalCase: EvalCase,
  projectRoot: string,
): string[] {
  const imageDir = path.join(projectRoot, evalCase.image_dir);
  return evalCase.image_files.map((file) => path.join(imageDir, file));
}

export function resolveGoldenPath(
  evalCase: EvalCase,
  projectRoot: string,
): string | undefined {
  if (!evalCase.golden_output_path) return undefined;
  return path.join(projectRoot, "eval", evalCase.golden_output_path);
}

export function resolveDemoPath(
  evalCase: EvalCase,
  projectRoot: string,
): string | undefined {
  if (!evalCase.demo_output_path) return undefined;
  return path.join(projectRoot, evalCase.demo_output_path);
}

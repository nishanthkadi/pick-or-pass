/**
 * Register a new eval case in eval/dataset.jsonl after validation.
 *
 * Usage:
 *   npm run eval:add -- --dry-run --file case.json
 *   echo '{...full rubric...}' | npm run eval:add -- --dry-run
 *
 * Full rubric is required — use --file or stdin JSON (see eval/README.md).
 */
import fs from "node:fs";
import path from "node:path";
import {
  fillEvalCaseDefaults,
  getProjectRoot,
  registerEvalCase,
  type EvalCaseInput,
} from "../src/lib/eval/loadDataset";

const PROJECT_ROOT = getProjectRoot(process.cwd());

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function splitPipeList(value: string): string[] {
  return value
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseArgs(): {
  dryRun: boolean;
  file?: string;
  input?: EvalCaseInput;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileIdx = args.indexOf("--file");
  const file = fileIdx >= 0 ? args[fileIdx + 1] : undefined;

  const getFlag = (name: string): string | undefined => {
    const idx = args.indexOf(name);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const id = getFlag("--id");
  const description = getFlag("--description");
  const grade = getFlag("--grade") as "good" | "not_sure" | "avoid" | undefined;
  const images = getFlag("--images");
  const tags = getFlag("--tags");
  const alignment = getFlag("--alignment");
  const visitSummary = getFlag("--visit-summary");
  const reasonThemes = getFlag("--reason-themes");
  const sellerQuestions = getFlag("--seller-questions");
  const mustNot = getFlag("--must-not");
  const photoSignal = getFlag("--photo-signal");
  const whyGrade = getFlag("--why-grade");
  const pmNote = getFlag("--pm-note");
  const noDemo = args.includes("--no-demo");

  if (id || description || grade || images) {
    const missing: string[] = [];
    if (!id) missing.push("--id");
    if (!description) missing.push("--description");
    if (!grade) missing.push("--grade");
    if (!images) missing.push("--images");
    if (!tags) missing.push("--tags");
    if (!alignment) missing.push("--alignment");
    if (!visitSummary) missing.push("--visit-summary");
    if (!reasonThemes) missing.push("--reason-themes");
    if (!sellerQuestions) missing.push("--seller-questions");
    if (!mustNot) missing.push("--must-not");
    if (!photoSignal) missing.push("--photo-signal");
    if (!whyGrade) missing.push("--why-grade");

    if (missing.length > 0) {
      console.error("CLI mode requires full rubric. Missing flags:");
      for (const flag of missing) {
        console.error(`  ${flag}`);
      }
      console.error("\nPrefer: npm run eval:add -- --file case.json");
      process.exit(1);
    }

    const input: EvalCaseInput = {
      id: id!,
      description: description!,
      image_files: images!.split(",").map((s) => s.trim()),
      tags: tags!.split(",").map((s) => s.trim()),
      expected: {
        grade: grade!,
        text_photo_alignment: alignment as NonNullable<
          EvalCaseInput["expected"]
        >["text_photo_alignment"],
        visit_summary_must_convey: visitSummary!,
        must_include_reason_themes: splitPipeList(reasonThemes!),
        should_ask_seller: splitPipeList(sellerQuestions!),
        must_not_include: splitPipeList(mustNot!),
      },
      notes: {
        photo_signal: photoSignal!,
        why_this_grade: whyGrade!,
        ...(pmNote ? { pm_note: pmNote } : {}),
      },
      use_as_cached_demo: !noDemo,
    };

    return { dryRun, file, input };
  }

  return { dryRun, file };
}

function printSummary(evalCase: ReturnType<typeof fillEvalCaseDefaults>) {
  console.log("\nEval case preview:");
  console.log(`  id:          ${evalCase.id}`);
  console.log(`  grade:       ${evalCase.expected.grade}`);
  console.log(`  alignment:   ${evalCase.expected.text_photo_alignment}`);
  console.log(`  images:      ${evalCase.image_files.join(", ")}`);
  console.log(`  tags:        ${evalCase.tags.join(", ")}`);
  console.log(`  reasons:     ${evalCase.expected.must_include_reason_themes.length} themes`);
  console.log(`  questions:   ${evalCase.expected.should_ask_seller.length} seller asks`);
  console.log(`  guardrails:  ${evalCase.expected.must_not_include.length} must-not`);
  console.log(`  golden:      eval/${evalCase.golden_output_path}`);
  if (evalCase.use_as_cached_demo) {
    console.log(`  demo sync:   ${evalCase.demo_output_path}`);
  }
  console.log(
    `  description: ${evalCase.description.slice(0, 80)}${evalCase.description.length > 80 ? "…" : ""}`,
  );
}

async function main() {
  const parsed = parseArgs();
  let input: EvalCaseInput | undefined = parsed.input;

  if (parsed.file) {
    const filePath = path.isAbsolute(parsed.file)
      ? parsed.file
      : path.join(process.cwd(), parsed.file);
    input = JSON.parse(fs.readFileSync(filePath, "utf-8")) as EvalCaseInput;
  } else if (!input && !process.stdin.isTTY) {
    const raw = await readStdin();
    if (raw.trim()) {
      input = JSON.parse(raw) as EvalCaseInput;
    }
  }

  if (!input) {
    console.error(`Usage:
  npm run eval:add -- --dry-run --file case.json
  echo '{...}' | npm run eval:add -- --dry-run

Full rubric required — see eval/README.md and .cursor/skills/add-eval-sample/SKILL.md

CLI flags (pipe-separated lists use |):
  --id --description --grade --images --tags --alignment
  --visit-summary --reason-themes --seller-questions --must-not
  --photo-signal --why-grade [--pm-note] [--no-demo] [--dry-run]`);
    process.exit(1);
  }

  const result = registerEvalCase(input, PROJECT_ROOT, {
    dryRun: parsed.dryRun,
  });

  if (!result.ok) {
    console.error("Validation failed:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  printSummary(result.evalCase);

  if (parsed.dryRun) {
    console.log("\n✓ Validation passed (dry run — not registered)");
  } else {
    console.log("\n✓ Registered in eval/dataset.jsonl");
    console.log(`\nNext: npm run eval -- ${result.evalCase.id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

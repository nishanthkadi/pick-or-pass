/**
 * Eval runner — reads eval/dataset.jsonl, calls Gemini (or scores golden), saves outputs.
 *
 * Usage:
 *   npm run eval
 *   npm run eval -- listing-3
 *   npm run eval -- --no-sync
 *   npm run eval -- --score-only
 *   npm run eval -- --score-only listing-4
 *
 * Requires:
 *   - .env.local with GEMINI_API_KEY (unless --score-only)
 *   - Images under project assets/ (see eval/dataset.jsonl)
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { analyzeListing } from "../src/lib/gemini/analyze";
import {
  getProjectRoot,
  loadEvalDataset,
  resolveDemoPath,
  resolveGoldenPath,
  resolveImagePaths,
  type EvalCase,
} from "../src/lib/eval/loadDataset";
import {
  printScoreSummary,
  scoreEvalRun,
  type EvalScore,
} from "../src/lib/eval/scoreEvalRun";
import { parseAnalysisResponse, type AnalysisResult } from "../src/lib/schema/analysis";

config({ path: ".env.local" });

const PROJECT_ROOT = getProjectRoot(process.cwd());
const RESULTS_DIR = path.join(PROJECT_ROOT, "eval", "results");

type RunResult = EvalScore & {
  expected_grade: string;
  actual_grade: string;
  visit_summary: string;
  timestamp: string;
};

function parseArgs(argv: string[]) {
  const noSync = argv.includes("--no-sync");
  const scoreOnly = argv.includes("--score-only");
  const caseId = argv.find((a) => !a.startsWith("--"));
  return { noSync, scoreOnly, caseId };
}

function loadGoldenResult(evalCase: EvalCase): AnalysisResult | null {
  const goldenPath = resolveGoldenPath(evalCase, PROJECT_ROOT);
  if (!goldenPath || !fs.existsSync(goldenPath)) {
    console.error(`No golden output: ${goldenPath ?? evalCase.id}`);
    return null;
  }
  const raw = fs.readFileSync(goldenPath, "utf-8");
  return parseAnalysisResponse(raw);
}

async function runCase(
  evalCase: EvalCase,
  options: { noSync: boolean; scoreOnly: boolean },
): Promise<EvalScore | null> {
  const imagePaths = resolveImagePaths(evalCase, PROJECT_ROOT);

  for (const imagePath of imagePaths) {
    if (!fs.existsSync(imagePath)) {
      console.error(`Missing image: ${imagePath}`);
      console.error("See eval/dataset.jsonl and assets/README.md");
      return null;
    }
  }

  console.log(`\nAnalyzing: ${evalCase.id}`);
  console.log(`Tags: ${evalCase.tags.join(", ")}`);
  console.log(`Expected grade: ${evalCase.expected.grade}`);

  let result: AnalysisResult;

  if (options.scoreOnly) {
    const golden = loadGoldenResult(evalCase);
    if (!golden) return null;
    result = golden;
    console.log(`Scoring golden: ${evalCase.id}`);
  } else {
    result = await analyzeListing({
      listingText: evalCase.description,
      imagePaths,
    });
  }

  console.log(`Got grade: ${result.grade} (${result.grade_label})`);
  console.log(`Visit summary: ${result.visit_summary}`);

  const score = scoreEvalRun(evalCase, result);

  for (const check of score.checks) {
    const icon = check.pass ? "✓" : "✗";
    console.log(`  ${icon} ${check.name}: ${check.detail}`);
  }

  if (!options.scoreOnly) {
    const json = JSON.stringify(result, null, 2);

    const goldenPath = resolveGoldenPath(evalCase, PROJECT_ROOT);
    if (goldenPath) {
      fs.mkdirSync(path.dirname(goldenPath), { recursive: true });
      fs.writeFileSync(goldenPath, json);
      console.log(`Saved golden: ${goldenPath}`);
    }

    const shouldSyncDemo =
      evalCase.use_as_cached_demo && !options.noSync;
    if (shouldSyncDemo) {
      const demoPath = resolveDemoPath(evalCase, PROJECT_ROOT);
      if (demoPath) {
        fs.mkdirSync(path.dirname(demoPath), { recursive: true });
        fs.writeFileSync(demoPath, json);
        console.log(`Synced demo: ${demoPath}`);
      }
    } else if (evalCase.use_as_cached_demo && options.noSync) {
      console.log("Skipped demo sync (--no-sync)");
    }
  }

  appendResult({
    ...score,
    expected_grade: evalCase.expected.grade,
    actual_grade: result.grade,
    visit_summary: result.visit_summary,
    timestamp: new Date().toISOString(),
  });

  return score;
}

function appendResult(entry: RunResult) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const resultsPath = path.join(RESULTS_DIR, `${date}.jsonl`);
  fs.appendFileSync(resultsPath, JSON.stringify(entry) + "\n");
}

async function main() {
  const { noSync, scoreOnly, caseId } = parseArgs(process.argv.slice(2));
  const allCases = loadEvalDataset({ projectRoot: PROJECT_ROOT });

  const cases = caseId
    ? allCases.filter((c) => c.id === caseId)
    : allCases;

  if (caseId && cases.length === 0) {
    console.error(`Unknown eval case: ${caseId}`);
    console.error(`Available: ${allCases.map((c) => c.id).join(", ")}`);
    process.exit(1);
  }

  if (!scoreOnly && !process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not found in .env.local");
    console.error("Use --score-only to score existing golden outputs without API calls.");
    process.exit(1);
  }

  const scores: EvalScore[] = [];
  for (const evalCase of cases) {
    const score = await runCase(evalCase, { noSync, scoreOnly });
    if (score) scores.push(score);
  }

  if (scores.length > 0) {
    printScoreSummary(scores);
  }

  const rubricPassed = scores.filter((s) => s.rubric_pass).length;
  console.log(
    `\nDone: ${rubricPassed}/${scores.length} full rubric pass` +
      (scoreOnly ? " (score-only)" : noSync ? " (no demo sync)" : ""),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

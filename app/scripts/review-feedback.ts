/**
 * Review consented app feedback and promote cases into the eval set.
 *
 * Usage (from app/):
 *   npm run review-feedback
 *   npm run review-feedback -- show <saved_listing_id>
 *   npm run review-feedback -- reject <id> [--note "..."]
 *   npm run review-feedback -- promote <id> --eval-id listing-11-... --grade avoid [--why "..."] [--dry-run]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  EVAL_ID_PATTERN,
  getProjectRoot,
  registerEvalCase,
  type EvalCaseInput,
} from "../src/lib/eval/loadDataset";

const PROJECT_ROOT = getProjectRoot(process.cwd());
const ASSETS_DIR = path.join(PROJECT_ROOT, "assets");
const REVIEW_EXPORT_DIR = path.join(PROJECT_ROOT, "eval", "_review_export");

type Grade = "good" | "not_sure" | "avoid";
type Alignment =
  | "matches"
  | "partially_matches"
  | "contradicts"
  | "insufficient_text";

type ReviewCandidate = {
  saved_listing_id: string;
  source: string;
  listing_label: string | null;
  listing_text: string | null;
  grade: string;
  text_photo_alignment: string | null;
  improvement_review_status: string;
  allow_improvement_use: boolean;
  analysis_result: Record<string, unknown> | null;
  feedback_id: string;
  helpfulness: string;
  issue_tags: string[] | null;
  comment: string | null;
  feedback_updated_at: string;
  photo_count: number;
  photos: Array<{
    storage_path: string;
    original_filename: string | null;
    content_type: string | null;
  }>;
};

function getArg(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function usage(): never {
  console.error(`Usage:
  npm run review-feedback
  npm run review-feedback -- show <saved_listing_id>
  npm run review-feedback -- reject <id> [--note "..."]
  npm run review-feedback -- promote <id> --eval-id listing-N-slug --grade good|not_sure|avoid [--why "..."] [--dry-run]
`);
  process.exit(1);
}

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function photoBucket(): string {
  return (
    process.env.SUPABASE_SAVED_LISTINGS_BUCKET?.trim() || "saved-listing-photos"
  );
}

function extFromPhoto(photo: {
  storage_path: string;
  original_filename: string | null;
  content_type: string | null;
}): string {
  const name = photo.original_filename || photo.storage_path;
  const ext = path.extname(name).toLowerCase();
  if (ext) return ext;
  if (photo.content_type === "image/png") return ".png";
  if (photo.content_type === "image/webp") return ".webp";
  return ".jpg";
}

async function loadCandidates(
  sb: SupabaseClient,
  options?: { status?: string; id?: string },
): Promise<ReviewCandidate[]> {
  let listingQuery = sb
    .from("saved_listings")
    .select(
      "id, source, listing_label, listing_text, grade, text_photo_alignment, improvement_review_status, allow_improvement_use, analysis_result, created_at",
    )
    .eq("allow_improvement_use", true)
    .neq("improvement_review_status", "not_shared");

  if (options?.id) {
    listingQuery = listingQuery.eq("id", options.id);
  } else if (options?.status) {
    listingQuery = listingQuery.eq(
      "improvement_review_status",
      options.status,
    );
  } else {
    listingQuery = listingQuery.in("improvement_review_status", [
      "unreviewed",
      "eval_candidate",
    ]);
  }

  const { data: listings, error: lerr } = await listingQuery.order("created_at", {
    ascending: false,
  });
  if (lerr) throw new Error(lerr.message);

  const rows = listings ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id as string);
  const { data: feedbackRows, error: ferr } = await sb
    .from("listing_feedback")
    .select(
      "id, saved_listing_id, helpfulness, issue_tags, comment, updated_at, created_at",
    )
    .in("saved_listing_id", ids)
    .order("updated_at", { ascending: false });
  if (ferr) throw new Error(ferr.message);

  const { data: photoRows, error: perr } = await sb
    .from("saved_listing_photos")
    .select("saved_listing_id, storage_path, original_filename, content_type, created_at")
    .in("saved_listing_id", ids)
    .order("created_at", { ascending: true });
  if (perr) throw new Error(perr.message);

  const feedbackByListing = new Map<string, (typeof feedbackRows)[number]>();
  for (const fb of feedbackRows ?? []) {
    const listingId = fb.saved_listing_id as string;
    if (!feedbackByListing.has(listingId)) {
      feedbackByListing.set(listingId, fb);
    }
  }

  const photosByListing = new Map<string, NonNullable<typeof photoRows>>();
  for (const photo of photoRows ?? []) {
    const listingId = photo.saved_listing_id as string;
    const list = photosByListing.get(listingId) ?? [];
    list.push(photo);
    photosByListing.set(listingId, list);
  }

  const candidates: ReviewCandidate[] = [];
  for (const listing of rows) {
    const fb = feedbackByListing.get(listing.id as string);
    if (!fb) continue;
    const photos = photosByListing.get(listing.id as string) ?? [];
    candidates.push({
      saved_listing_id: listing.id as string,
      source: listing.source as string,
      listing_label: (listing.listing_label as string | null) ?? null,
      listing_text: (listing.listing_text as string | null) ?? null,
      grade: listing.grade as string,
      text_photo_alignment:
        (listing.text_photo_alignment as string | null) ?? null,
      improvement_review_status: listing.improvement_review_status as string,
      allow_improvement_use: Boolean(listing.allow_improvement_use),
      analysis_result:
        (listing.analysis_result as Record<string, unknown> | null) ?? null,
      feedback_id: fb.id as string,
      helpfulness: fb.helpfulness as string,
      issue_tags: (fb.issue_tags as string[] | null) ?? [],
      comment: (fb.comment as string | null) ?? null,
      feedback_updated_at: (fb.updated_at as string) ?? (fb.created_at as string),
      photo_count: photos.length,
      photos: photos.map((p) => ({
        storage_path: p.storage_path as string,
        original_filename: (p.original_filename as string | null) ?? null,
        content_type: (p.content_type as string | null) ?? null,
      })),
    });
  }

  candidates.sort((a, b) =>
    a.feedback_updated_at < b.feedback_updated_at ? 1 : -1,
  );
  return candidates;
}

async function downloadPhotos(
  sb: SupabaseClient,
  candidate: ReviewCandidate,
  destDir: string,
  namePrefix: string,
): Promise<string[]> {
  fs.mkdirSync(destDir, { recursive: true });
  const savedNames: string[] = [];
  let index = 1;
  for (const photo of candidate.photos) {
    const { data, error } = await sb.storage
      .from(photoBucket())
      .download(photo.storage_path);
    if (error || !data) {
      throw new Error(
        `Failed to download ${photo.storage_path}: ${error?.message ?? "empty"}`,
      );
    }
    const ext = extFromPhoto(photo);
    const fileName =
      candidate.photos.length === 1
        ? `${namePrefix}${ext}`
        : `${namePrefix}-${index}${ext}`;
    const dest = path.join(destDir, fileName);
    fs.writeFileSync(dest, Buffer.from(await data.arrayBuffer()));
    savedNames.push(fileName);
    index += 1;
  }
  return savedNames;
}

function parsePriceUsd(text: string): number | undefined {
  const match = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function buildEvalCaseFromCandidate(
  candidate: ReviewCandidate,
  options: {
    evalId: string;
    grade: Grade;
    why?: string;
    imageFiles: string[];
  },
): EvalCaseInput {
  const analysis = candidate.analysis_result ?? {};
  const description = (candidate.listing_text ?? "").trim();
  const visitFromModel =
    typeof analysis.visit_summary === "string" ? analysis.visit_summary : "";
  const alignmentRaw =
    (typeof analysis.text_photo_alignment === "string"
      ? analysis.text_photo_alignment
      : candidate.text_photo_alignment) ?? "partially_matches";
  const alignment = (
    ["matches", "partially_matches", "contradicts", "insufficient_text"].includes(
      alignmentRaw,
    )
      ? alignmentRaw
      : "partially_matches"
  ) as Alignment;

  const reasonTexts = Array.isArray(analysis.reasons)
    ? analysis.reasons
        .map((r) =>
          r && typeof r === "object" && typeof (r as { text?: unknown }).text === "string"
            ? (r as { text: string }).text
            : null,
        )
        .filter((t): t is string => Boolean(t && t.trim().length >= 8))
    : [];

  const themes = reasonTexts.slice(0, 5);
  while (themes.length < 3) {
    themes.push(
      options.grade === "avoid"
        ? "listing raises trip-worthiness concerns visible in photos or text"
        : options.grade === "good"
          ? "listing materials support a careful trip with confirmation questions"
          : "key unknowns remain before driving to this meetup",
    );
  }

  const sellerQs = Array.isArray(analysis.seller_questions)
    ? analysis.seller_questions
        .filter((q): q is string => typeof q === "string" && q.trim().length >= 5)
        .slice(0, 6)
    : [];
  while (sellerQs.length < 3) {
    sellerQs.push(
      sellerQs.length === 0
        ? "is everything shown in the photos still available"
        : sellerQs.length === 1
          ? "any damage or missing pieces I should know about"
          : "what is your best price if not listed clearly",
    );
  }

  const tags = new Set<string>([
    options.grade === "avoid"
      ? "avoid"
      : options.grade === "good"
        ? "good_listing"
        : "not_sure",
    "from_feedback",
    candidate.source === "analyze" ? "live_analyze" : "demo_source",
  ]);
  if (options.grade === "avoid" && /paint|chip|flake|wood|wooden/i.test(description + visitFromModel + themes.join(" "))) {
    tags.add("worn_paint");
    tags.add("wooden_toy");
  }
  if (candidate.photo_count > 1) tags.add("multi_photo");
  if (parsePriceUsd(description) != null) tags.add("listed_price");

  const why =
    options.why?.trim() ||
    (typeof analysis.visit_summary === "string" && analysis.visit_summary.length >= 20
      ? `Promoted from consented feedback (${candidate.helpfulness}). Model visit summary: ${analysis.visit_summary}`
      : `Promoted from consented app feedback marked ${candidate.helpfulness}; expected grade ${options.grade}.`);

  const photoSignal =
    candidate.photo_count > 0
      ? `Real Marketplace listing photos from consented feedback (${candidate.photo_count} image${candidate.photo_count === 1 ? "" : "s"}). Reviewer confirmed they support expected grade ${options.grade}.`
      : "No photos were attached to this feedback case; text-only materials.";

  const visitSummary =
    visitFromModel.length >= 15
      ? visitFromModel.slice(0, 200)
      : options.grade === "avoid"
        ? "Skip this trip — listing issues make it not worth driving for"
        : options.grade === "good"
          ? "Worth a trip if you confirm key details with the seller first"
          : "Don't drive yet — ask the seller about key gaps before committing";

  const price = parsePriceUsd(description);
  const listing_context =
    price != null ? { listed_price_usd: price } : undefined;

  return {
    id: options.evalId,
    description,
    image_files: options.imageFiles,
    image_dir: "assets",
    tags: [...tags].slice(0, 8),
    expected: {
      grade: options.grade,
      text_photo_alignment: alignment,
      visit_summary_must_convey: visitSummary,
      must_include_reason_themes: themes.slice(0, 6).map((t) => t.slice(0, 200)),
      should_ask_seller: sellerQs.slice(0, 6),
      must_not_include: [
        "proximity or meetup location as grading signal",
        "hype language or urgency pressure",
        "absolute commands like avoid at all costs",
      ],
    },
    notes: {
      photo_signal: photoSignal,
      why_this_grade: why.slice(0, 500),
      pm_note: `Promoted from saved_listing ${candidate.saved_listing_id}; feedback ${candidate.helpfulness}${
        candidate.comment ? `; comment: ${candidate.comment}` : ""
      }.`,
    },
    listing_context,
    use_as_cached_demo: false,
  };
}

async function recordDecision(
  sb: SupabaseClient,
  savedListingId: string,
  decision: "eval_candidate" | "added_to_eval" | "rejected",
  note?: string,
) {
  const { error: updateError } = await sb
    .from("saved_listings")
    .update({ improvement_review_status: decision })
    .eq("id", savedListingId);
  if (updateError) throw new Error(updateError.message);

  const { error: insertError } = await sb.from("improvement_reviews").insert({
    saved_listing_id: savedListingId,
    decision,
    review_notes: note ?? null,
  });
  if (insertError) throw new Error(insertError.message);
}

async function cmdList(sb: SupabaseClient) {
  const candidates = await loadCandidates(sb);
  if (candidates.length === 0) {
    console.log("No unreviewed / eval_candidate feedback cases.");
    return;
  }
  console.log(`Found ${candidates.length} review candidate(s):\n`);
  for (const c of candidates) {
    console.log(
      [
        c.saved_listing_id,
        c.improvement_review_status.padEnd(14),
        c.helpfulness.padEnd(12),
        `grade=${c.grade}`.padEnd(14),
        `photos=${c.photo_count}`,
        c.listing_label ?? "(no label)",
      ].join("  "),
    );
  }
  console.log(
    `\nNext: npm run review-feedback -- show <id>\nThen: promote or reject.`,
  );
}

async function cmdShow(sb: SupabaseClient, id: string) {
  const [candidate] = await loadCandidates(sb, { id });
  if (!candidate) {
    console.error(`No feedback-backed listing found for id ${id}`);
    process.exit(1);
  }

  const exportDir = path.join(REVIEW_EXPORT_DIR, id);
  let localPhotos: string[] = [];
  if (candidate.photo_count > 0) {
    localPhotos = await downloadPhotos(sb, candidate, exportDir, "photo");
  }

  console.log(
    JSON.stringify(
      {
        saved_listing_id: candidate.saved_listing_id,
        status: candidate.improvement_review_status,
        source: candidate.source,
        label: candidate.listing_label,
        model_grade: candidate.grade,
        alignment: candidate.text_photo_alignment,
        helpfulness: candidate.helpfulness,
        issue_tags: candidate.issue_tags,
        comment: candidate.comment,
        photo_count: candidate.photo_count,
        export_dir: candidate.photo_count > 0 ? exportDir : null,
        exported_photos: localPhotos,
        listing_text: candidate.listing_text,
        visit_summary: candidate.analysis_result?.visit_summary ?? null,
        reasons: candidate.analysis_result?.reasons ?? null,
      },
      null,
      2,
    ),
  );
}

async function cmdReject(sb: SupabaseClient, id: string, note?: string) {
  const [candidate] = await loadCandidates(sb, { id });
  if (!candidate) {
    console.error(`No feedback-backed listing found for id ${id}`);
    process.exit(1);
  }
  await recordDecision(sb, id, "rejected", note ?? "Rejected during CLI review.");
  console.log(`Rejected ${id}`);
}

async function cmdPromote(
  sb: SupabaseClient,
  id: string,
  options: { evalId: string; grade: Grade; why?: string; dryRun: boolean },
) {
  const [candidate] = await loadCandidates(sb, { id });
  if (!candidate) {
    console.error(`No feedback-backed listing found for id ${id}`);
    process.exit(1);
  }
  if (!candidate.allow_improvement_use) {
    console.error("Listing is not consented for improvement use.");
    process.exit(1);
  }
  if (candidate.improvement_review_status === "added_to_eval") {
    console.error("Listing is already marked added_to_eval.");
    process.exit(1);
  }
  if (!EVAL_ID_PATTERN.test(options.evalId)) {
    console.error(
      "eval-id must be lowercase letters, numbers, and hyphens (e.g. listing-11-thomas-wooden)",
    );
    process.exit(1);
  }
  if (!candidate.listing_text?.trim()) {
    console.error("Listing has no text to promote.");
    process.exit(1);
  }
  if (candidate.photo_count === 0) {
    console.warn(
      "Warning: no photos on this feedback case. Eval requires images — aborting.",
    );
    process.exit(1);
  }

  const imageFiles = await downloadPhotos(
    sb,
    candidate,
    ASSETS_DIR,
    options.evalId,
  );
  console.log(`Saved ${imageFiles.length} photo(s) to assets/: ${imageFiles.join(", ")}`);

  const input = buildEvalCaseFromCandidate(candidate, {
    evalId: options.evalId,
    grade: options.grade,
    why: options.why,
    imageFiles,
  });

  const result = registerEvalCase(input, PROJECT_ROOT, {
    dryRun: options.dryRun,
  });
  if (!result.ok) {
    console.error("Eval case validation failed:");
    for (const err of result.errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  if (options.dryRun) {
    console.log("Dry run OK. Would append:");
    console.log(JSON.stringify(result.evalCase, null, 2));
    return;
  }

  await recordDecision(
    sb,
    id,
    "added_to_eval",
    `Promoted to eval as ${options.evalId} with expected grade ${options.grade}.`,
  );

  console.log(`Promoted ${id} → eval/${options.evalId}`);
  console.log(`Dataset: eval/dataset.jsonl`);
  console.log(`Next: npm run eval -- ${options.evalId}`);
}

async function main() {
  const args = process.argv.slice(2);
  const sb = getSupabase();
  const command = args[0];

  if (!command) {
    await cmdList(sb);
    return;
  }

  if (command === "show") {
    const id = args[1];
    if (!id) usage();
    await cmdShow(sb, id);
    return;
  }

  if (command === "reject") {
    const id = args[1];
    if (!id) usage();
    await cmdReject(sb, id, getArg(args, "--note"));
    return;
  }

  if (command === "promote") {
    const id = args[1];
    const evalId = getArg(args, "--eval-id");
    const grade = getArg(args, "--grade") as Grade | undefined;
    const why = getArg(args, "--why");
    const dryRun = args.includes("--dry-run");
    if (!id || !evalId || !grade) usage();
    if (!["good", "not_sure", "avoid"].includes(grade)) {
      console.error("--grade must be good | not_sure | avoid");
      process.exit(1);
    }
    await cmdPromote(sb, id, { evalId, grade, why, dryRun });
    return;
  }

  usage();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

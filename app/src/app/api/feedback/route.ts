import { feedbackRequestSchema } from "@/lib/feedback/schema";
import {
  getSupabaseAdminClient,
  SupabaseNotConfiguredError,
} from "@/lib/supabase/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const runtime = "nodejs";

type FeedbackRecord = {
  id: string;
  createdAt: string;
  feedback: unknown;
};

async function recordFeedback(record: FeedbackRecord, persistToFile = false) {
  const line = `${JSON.stringify(record)}\n`;

  if (persistToFile) {
    const inboxDir = path.join(process.cwd(), "..", "eval", "feedback");
    await mkdir(inboxDir, { recursive: true });
    await appendFile(path.join(inboxDir, "inbox.jsonl"), line, "utf8");
  }

  console.info("pick_or_pass_feedback", line.trim());
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Feedback request must be valid JSON.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  try {
    const feedback = feedbackRequestSchema.parse(body);
    const supabase = getSupabaseAdminClient();
    const record: FeedbackRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      feedback,
    };

    const { error } = await supabase.from("listing_feedback").insert({
      id: record.id,
      saved_listing_id: feedback.savedListingId,
      owner_token: feedback.ownerToken,
      helpfulness: feedback.helpfulness,
      grade_accuracy: feedback.gradeAccuracy,
      issue_tags: feedback.issueTags,
      comment: feedback.comment,
      metadata: feedback.metadata,
    });

    if (error) {
      throw new Error(error.message);
    }

    await recordFeedback(record, process.env.NODE_ENV !== "production");

    return NextResponse.json({ ok: true, id: record.id });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json(
        {
          error:
            "Feedback storage needs Supabase env vars before feedback can be saved.",
          code: "STORAGE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Feedback did not match the expected shape.",
          code: "BAD_REQUEST",
          issues: err.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const message =
      err instanceof Error ? err.message : "Could not record feedback.";
    return NextResponse.json(
      { error: message, code: "FEEDBACK_FAILED" },
      { status: 500 },
    );
  }
}

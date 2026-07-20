import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "MODEL_BUSY"
  | "INVALID_MODEL_OUTPUT"
  | "ANALYSIS_FAILED"
  | "SERVER_MISCONFIGURED";

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

export const RATE_LIMIT_MESSAGE =
  "Free demo limit reached. Try a cached example above, come back tomorrow, or paste your own Gemini API key to analyze now.";

export const GEMINI_QUOTA_MESSAGE =
  "The AI service is out of free quota right now. Try a sample listing, wait and retry later, or paste your own Gemini API key to continue.";

export const GEMINI_BUSY_MESSAGE =
  "The AI is busy right now. We'll retry shortly — or tap Try again. Sample listings still work anytime.";

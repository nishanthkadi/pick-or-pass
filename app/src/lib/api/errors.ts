import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "RATE_LIMITED"
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

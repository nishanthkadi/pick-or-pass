import { apiError, GEMINI_QUOTA_MESSAGE, RATE_LIMIT_MESSAGE } from "@/lib/api/errors";
import { parseAnalyzeRequest } from "@/lib/api/parseAnalyzeRequest";
import { analyzeListing, isGeminiQuotaError } from "@/lib/gemini/analyze";
import { buildAnalysisListingTextFromParts } from "@/lib/listing/buildAnalysisListingText";
import {
  checkRateLimit,
  getClientIp,
  recordRateLimitHit,
} from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Multimodal checks can exceed the Hobby default; fail with a response instead of hanging. */
export const maxDuration = 60;

export async function POST(req: Request) {
  let listingText: string;
  let sellerStarRating: number | undefined;
  let images: Awaited<ReturnType<typeof parseAnalyzeRequest>>["images"];
  let apiKey: string | undefined;

  try {
    ({ listingText, sellerStarRating, images, apiKey } =
      await parseAnalyzeRequest(req));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request.";
    return apiError(400, "BAD_REQUEST", message);
  }

  const usingByok = Boolean(apiKey);

  if (!usingByok) {
    const ip = getClientIp(req.headers.get("x-forwarded-for"));
    const limit = checkRateLimit(ip);

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: RATE_LIMIT_MESSAGE,
          code: "RATE_LIMITED" as const,
          reason: limit.reason,
          byokHint:
            "Pass apiKey in the request body to use your own Gemini key.",
        },
        {
          status: 429,
          headers: limit.retryAfterSeconds
            ? { "Retry-After": String(limit.retryAfterSeconds) }
            : undefined,
        },
      );
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      return apiError(
        503,
        "SERVER_MISCONFIGURED",
        "Server API key is not configured. Use BYOK or try a cached demo.",
      );
    }
  }

  try {
    const composedListingText = buildAnalysisListingTextFromParts(listingText, {
      seller_star_rating: sellerStarRating,
    });

    const result = await analyzeListing({
      listingText: composedListingText,
      images,
      apiKey,
    });

    if (!usingByok) {
      const ip = getClientIp(req.headers.get("x-forwarded-for"));
      recordRateLimitHit(ip);
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError(
        422,
        "INVALID_MODEL_OUTPUT",
        "Model returned invalid analysis JSON.",
        { issues: err.issues.map((i) => i.message) },
      );
    }

    const message =
      err instanceof Error ? err.message : "Analysis request failed.";

    if (isGeminiQuotaError(err) || /quota|rate.?limit|429/i.test(message)) {
      return NextResponse.json(
        {
          error: GEMINI_QUOTA_MESSAGE,
          code: "RATE_LIMITED" as const,
          reason: "gemini_quota",
          byokHint:
            "Pass apiKey in the request body to use your own Gemini key.",
        },
        { status: 429 },
      );
    }

    if (message.includes("Missing GEMINI_API_KEY")) {
      return apiError(
        503,
        "SERVER_MISCONFIGURED",
        "Server API key is not configured. Use BYOK or try a cached demo.",
      );
    }

    return apiError(500, "ANALYSIS_FAILED", message);
  }
}

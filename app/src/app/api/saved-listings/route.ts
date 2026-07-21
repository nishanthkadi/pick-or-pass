import {
  savedListingPayloadSchema,
  type ImprovementReviewStatus,
} from "@/lib/saved-listings/schema";
import {
  getSavedListingPhotoBucket,
  getSupabaseAdminClient,
  SupabaseNotConfiguredError,
} from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

type SavedListingPhotoRow = {
  storage_path: string;
};

type SavedListingRow = {
  id: string;
  result_key: string;
  source: "demo" | "analyze";
  listing_text: string | null;
  listing_label: string | null;
  listing_image_urls: string[] | null;
  analysis_result: unknown;
  grade: string;
  text_photo_alignment: string;
  allow_improvement_use: boolean;
  improvement_review_status: string;
  created_at: string;
  saved_listing_photos?: SavedListingPhotoRow[];
};

function getResultKey(payload: {
  source: string;
  listingText?: string;
  listingLabel?: string;
  listingImageUrls: string[];
  analysis: {
    grade: string;
    text_photo_alignment: string;
    visit_summary: string;
  };
}) {
  const raw = [
    payload.source,
    payload.listingLabel ?? "",
    payload.listingText ?? "",
    payload.listingImageUrls.join("|"),
    payload.analysis.grade,
    payload.analysis.text_photo_alignment,
    payload.analysis.visit_summary,
  ].join("::");

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }

  return `${payload.source}-${hash.toString(36).padStart(6, "0")}`;
}

function getListingLabel(payload: {
  listingText?: string;
  listingLabel?: string;
}) {
  const maxLabelLength = 48;
  const providedLabel = payload.listingLabel?.trim();
  if (providedLabel) {
    return shortenLabel(providedLabel, maxLabelLength);
  }

  const fieldLabels = new Set([
    "brand",
    "category",
    "condition",
    "description",
    "location",
    "price",
    "title",
  ]);
  const conditionValues = new Set([
    "new",
    "used",
    "used - fair",
    "used - good",
    "used - like new",
    "used - poor",
  ]);
  const lines = (payload.listingText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const brandIndex = lines.findIndex((line) => line.toLowerCase() === "brand");
  const brand =
    brandIndex >= 0 && lines[brandIndex + 1]
      ? cleanLabelText(lines[brandIndex + 1])
      : undefined;
  const titleIndex = lines.findIndex((line) => line.toLowerCase() === "title");
  const title =
    titleIndex >= 0 && lines[titleIndex + 1]
      ? cleanLabelText(lines[titleIndex + 1])
      : undefined;

  const productLine =
    title ??
    lines.find((line) => {
      const normalized = line.toLowerCase();
      return (
        line.length >= 12 &&
        !fieldLabels.has(normalized) &&
        !conditionValues.has(normalized) &&
        normalized !== brand?.toLowerCase()
      );
    }) ??
    lines.find((line) => line.length >= 8);

  const cleanedProductLine = productLine ? cleanLabelText(productLine) : "";
  const candidate =
    brand &&
    cleanedProductLine &&
    !cleanedProductLine.toLowerCase().startsWith(brand.toLowerCase())
      ? `${brand} ${cleanedProductLine}`
      : cleanedProductLine || brand;

  return candidate ? shortenLabel(candidate, maxLabelLength) : undefined;
}

function cleanLabelText(value: string) {
  return value
    .replace(
      /\b(in\s+)?(new|used|good|great|excellent|fair|poor|like new)\s+condition\b/gi,
      "",
    )
    .replace(/\bcondition\s*[:\-]?\s*/gi, "")
    .replace(/\bused\s*[-]\s*(good|fair|poor|like new)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortenLabel(value: string, maxLength: number) {
  const cleaned = cleanLabelText(value)
    .replace(/\bcaring for animals\b/gi, "")
    .replace(/\belectronic\b$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const shortened = cleaned.slice(0, maxLength + 1).replace(/\s+\S*$/, "");
  return shortened || cleaned.slice(0, maxLength);
}

function storageErrorMessage(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/fetch failed|failed to fetch|ENOTFOUND|ECONNREFUSED|network/i.test(message)) {
    return "Could not reach listing storage. Check Supabase env vars on the server, then try again.";
  }
  return message || fallback;
}

export async function GET(req: Request) {
  try {
    const ownerToken = new URL(req.url).searchParams.get("ownerToken")?.trim();
    if (!ownerToken) {
      return NextResponse.json(
        { error: "Missing owner token.", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("saved_listings")
      .select(
        [
          "id",
          "result_key",
          "source",
          "listing_text",
          "listing_label",
          "listing_image_urls",
          "analysis_result",
          "grade",
          "text_photo_alignment",
          "allow_improvement_use",
          "improvement_review_status",
          "created_at",
          "saved_listing_photos(storage_path)",
        ].join(","),
      )
      .eq("owner_token", ownerToken)
      .eq("user_saved", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    const bucket = getSavedListingPhotoBucket();
    const rows = (data ?? []) as unknown as SavedListingRow[];
    const listings = await Promise.all(
      rows.map(async (row) => {
        const signedUrls = await Promise.all(
          (row.saved_listing_photos ?? []).map(async (photo) => {
            const { data: signed } = await supabase.storage
              .from(bucket)
              .createSignedUrl(photo.storage_path, 60 * 60);
            return signed?.signedUrl;
          }),
        );

        return {
          id: row.id,
          source: row.source,
          listingText: row.listing_text ?? "",
          listingLabel: row.listing_label ?? undefined,
          imageUrls: signedUrls.filter(Boolean).length
            ? signedUrls.filter((url): url is string => Boolean(url))
            : row.listing_image_urls ?? [],
          analysis: row.analysis_result,
          grade: row.grade,
          textPhotoAlignment: row.text_photo_alignment,
          allowImprovementUse: row.allow_improvement_use,
          improvementReviewStatus: row.improvement_review_status,
          createdAt: row.created_at,
        };
      }),
    );

    return NextResponse.json({ listings });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json(
        {
          error:
            "Saved listings need Supabase env vars before they can be loaded.",
          code: "STORAGE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const message = storageErrorMessage(
      err,
      "Could not load saved listings.",
    );
    return NextResponse.json(
      { error: message, code: "LOAD_SAVED_LISTINGS_FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let rawPayload: unknown;

  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      rawPayload = await req.json();
    } else {
      const formData = await req.formData();
      const payloadPart = formData.get("payload");
      if (typeof payloadPart !== "string") {
        return NextResponse.json(
          { error: "Missing saved listing payload.", code: "BAD_REQUEST" },
          { status: 400 },
        );
      }
      rawPayload = JSON.parse(payloadPart);
    }
  } catch {
    return NextResponse.json(
      {
        error: "Save request must be valid JSON or multipart form data.",
        code: "BAD_REQUEST",
      },
      { status: 400 },
    );
  }

  try {
    const payload = savedListingPayloadSchema.parse(rawPayload);
    // Photos are uploaded separately via /api/saved-listings/photos (one per call).
    const supabase = getSupabaseAdminClient();
    const improvementReviewStatus: ImprovementReviewStatus =
      payload.allowImprovementUse ? "unreviewed" : "not_shared";
    const resultKey = getResultKey(payload);
    const listingLabel = getListingLabel(payload);

    const { data: existingListing, error: existingError } = await supabase
      .from("saved_listings")
      .select("id,user_saved,listing_label")
      .eq("owner_token", payload.ownerToken)
      .eq("result_key", resultKey)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    const listingMutation = existingListing?.id
      ? supabase
          .from("saved_listings")
          .update({
            user_saved: Boolean(
              existingListing.user_saved || payload.userSaved,
            ),
            allow_improvement_use: payload.allowImprovementUse,
            improvement_review_status: improvementReviewStatus,
            listing_label: existingListing.listing_label || listingLabel,
          })
          .eq("id", existingListing.id)
          .select("id")
          .single()
      : supabase
          .from("saved_listings")
          .insert({
            owner_token: payload.ownerToken,
            result_key: resultKey,
            source: payload.source,
            listing_text: payload.listingText,
            listing_label: listingLabel,
            listing_image_urls:
              payload.source === "demo" ? payload.listingImageUrls : [],
            analysis_result: payload.analysis,
            grade: payload.analysis.grade,
            text_photo_alignment: payload.analysis.text_photo_alignment,
            user_saved: payload.userSaved,
            allow_improvement_use: payload.allowImprovementUse,
            improvement_review_status: improvementReviewStatus,
          })
          .select("id")
          .single();

    const { data: listing, error: listingError } = await listingMutation;

    if (listingError || !listing?.id) {
      throw new Error(listingError?.message || "Could not save listing.");
    }

    return NextResponse.json({
      ok: true,
      savedListingId: listing.id,
      photoCount: 0,
      improvementReviewStatus,
    });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json(
        {
          error:
            "Saved listings need Supabase env vars before photos can be stored.",
          code: "STORAGE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    if (err instanceof SyntaxError || err instanceof ZodError) {
      return NextResponse.json(
        { error: "Saved listing payload is invalid.", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const message = storageErrorMessage(err, "Could not save listing.");
    return NextResponse.json(
      { error: message, code: "SAVE_LISTING_FAILED" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Update request must be valid JSON.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Missing saved listing update payload.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const {
    savedListingId,
    ownerToken,
    allowImprovementUse,
  } = body as {
    savedListingId?: unknown;
    ownerToken?: unknown;
    allowImprovementUse?: unknown;
  };

  if (
    typeof savedListingId !== "string" ||
    typeof ownerToken !== "string" ||
    typeof allowImprovementUse !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Saved listing update payload is invalid.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const improvementReviewStatus: ImprovementReviewStatus =
      allowImprovementUse ? "unreviewed" : "not_shared";

    const { error } = await supabase
      .from("saved_listings")
      .update({
        user_saved: true,
        allow_improvement_use: allowImprovementUse,
        improvement_review_status: improvementReviewStatus,
      })
      .eq("id", savedListingId)
      .eq("owner_token", ownerToken);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      savedListingId,
      improvementReviewStatus,
    });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json(
        {
          error:
            "Saved listings need Supabase env vars before they can be updated.",
          code: "STORAGE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const message = storageErrorMessage(
      err,
      "Could not update saved listing.",
    );
    return NextResponse.json(
      { error: message, code: "UPDATE_SAVED_LISTING_FAILED" },
      { status: 500 },
    );
  }
}

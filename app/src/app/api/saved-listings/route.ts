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

const MAX_PHOTOS = 3;

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

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 80);
}

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
  const providedLabel = payload.listingLabel?.trim();
  if (providedLabel) {
    return providedLabel;
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
  const candidate =
    lines.find((line) => {
      const normalized = line.toLowerCase();
      return (
        line.length >= 18 &&
        !fieldLabels.has(normalized) &&
        !conditionValues.has(normalized)
      );
    }) ?? lines.find((line) => line.length >= 8);

  return candidate ? candidate.slice(0, 120) : undefined;
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

    const message =
      err instanceof Error ? err.message : "Could not load saved listings.";
    return NextResponse.json(
      { error: message, code: "LOAD_SAVED_LISTINGS_FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Save request must be multipart form data.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const payloadPart = formData.get("payload");
  if (typeof payloadPart !== "string") {
    return NextResponse.json(
      { error: "Missing saved listing payload.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  try {
    const payload = savedListingPayloadSchema.parse(JSON.parse(payloadPart));
    const photos = formData
      .getAll("photos")
      .filter((item): item is File => item instanceof File)
      .slice(0, MAX_PHOTOS);
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

    const bucket = getSavedListingPhotoBucket();
    const photoRows = [];

    for (const photo of existingListing?.id ? [] : photos) {
      const extensionName = safeFileName(photo.name || "listing-photo");
      const storagePath = [
        payload.ownerToken,
        listing.id,
        `${crypto.randomUUID()}-${extensionName}`,
      ].join("/");

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, Buffer.from(await photo.arrayBuffer()), {
          contentType: photo.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      photoRows.push({
        saved_listing_id: listing.id,
        storage_path: storagePath,
        original_filename: photo.name || null,
        content_type: photo.type || null,
      });
    }

    if (photoRows.length > 0) {
      const { error: photosError } = await supabase
        .from("saved_listing_photos")
        .insert(photoRows);

      if (photosError) {
        throw new Error(photosError.message);
      }

      const photoReferences = photoRows.map(
        (photo) => `storage://${bucket}/${photo.storage_path}`,
      );
      const { error: photoReferencesError } = await supabase
        .from("saved_listings")
        .update({ listing_image_urls: photoReferences })
        .eq("id", listing.id);

      if (photoReferencesError) {
        throw new Error(photoReferencesError.message);
      }
    }

    return NextResponse.json({
      ok: true,
      savedListingId: listing.id,
      photoCount: photoRows.length,
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

    const message =
      err instanceof Error ? err.message : "Could not save listing.";
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

    const message =
      err instanceof Error ? err.message : "Could not update saved listing.";
    return NextResponse.json(
      { error: message, code: "UPDATE_SAVED_LISTING_FAILED" },
      { status: 500 },
    );
  }
}

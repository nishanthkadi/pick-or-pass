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

    const { data: listing, error: listingError } = await supabase
      .from("saved_listings")
      .insert({
        owner_token: payload.ownerToken,
        source: payload.source,
        listing_text: payload.listingText,
        listing_label: payload.listingLabel,
        listing_image_urls: payload.source === "demo" ? payload.listingImageUrls : [],
        analysis_result: payload.analysis,
        grade: payload.analysis.grade,
        text_photo_alignment: payload.analysis.text_photo_alignment,
        user_saved: payload.userSaved,
        allow_improvement_use: payload.allowImprovementUse,
        improvement_review_status: improvementReviewStatus,
      })
      .select("id")
      .single();

    if (listingError || !listing?.id) {
      throw new Error(listingError?.message || "Could not save listing.");
    }

    const bucket = getSavedListingPhotoBucket();
    const photoRows = [];

    for (const photo of photos) {
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

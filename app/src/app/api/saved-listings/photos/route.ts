import {
  getSavedListingPhotoBucket,
  getSupabaseAdminClient,
  SupabaseNotConfiguredError,
} from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 80);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function storageErrorMessage(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/fetch failed|failed to fetch|ENOTFOUND|ECONNREFUSED|network/i.test(message)) {
    return "Could not reach listing photo storage. Check Supabase env vars, then try again.";
  }
  return message || fallback;
}

async function uploadWithRetries(
  upload: () => Promise<{ error: { message: string } | null }>,
) {
  let lastMessage = "Upload failed.";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error } = await upload();
      if (!error) return;
      lastMessage = error.message;
    } catch (err) {
      lastMessage = storageErrorMessage(err, lastMessage);
    }
    if (attempt < 3) {
      await sleep(400 * attempt);
    }
  }
  throw new Error(lastMessage);
}

/** One photo per request — keeps payloads small and retries isolated. */
export async function POST(req: Request) {
  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Photo upload must be multipart form data.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const savedListingId = formData.get("savedListingId");
  const ownerToken = formData.get("ownerToken");
  const photo = formData.get("photo");

  if (
    typeof savedListingId !== "string" ||
    typeof ownerToken !== "string" ||
    !(photo instanceof File)
  ) {
    return NextResponse.json(
      {
        error: "savedListingId, ownerToken, and photo file are required.",
        code: "BAD_REQUEST",
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: listing, error: listingError } = await supabase
      .from("saved_listings")
      .select("id,listing_image_urls")
      .eq("id", savedListingId)
      .eq("owner_token", ownerToken)
      .maybeSingle();

    if (listingError) {
      throw new Error(listingError.message);
    }
    if (!listing?.id) {
      return NextResponse.json(
        { error: "Saved listing not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const { count: existingPhotoCount, error: countError } = await supabase
      .from("saved_listing_photos")
      .select("id", { count: "exact", head: true })
      .eq("saved_listing_id", listing.id);

    if (countError) {
      throw new Error(countError.message);
    }
    if ((existingPhotoCount ?? 0) >= 3) {
      return NextResponse.json({
        ok: true,
        savedListingId: listing.id,
        skipped: true,
        reason: "photo_limit",
      });
    }

    const bucket = getSavedListingPhotoBucket();
    const extensionName = safeFileName(photo.name || "listing-photo");
    const storagePath = [
      ownerToken,
      listing.id,
      `${crypto.randomUUID()}-${extensionName}`,
    ].join("/");
    const bytes = Buffer.from(await photo.arrayBuffer());

    await uploadWithRetries(() =>
      supabase.storage.from(bucket).upload(storagePath, bytes, {
        contentType: photo.type || "application/octet-stream",
        upsert: false,
      }),
    );

    const { error: photoRowError } = await supabase
      .from("saved_listing_photos")
      .insert({
        saved_listing_id: listing.id,
        storage_path: storagePath,
        original_filename: photo.name || null,
        content_type: photo.type || null,
      });

    if (photoRowError) {
      throw new Error(photoRowError.message);
    }

    const storageRef = `storage://${bucket}/${storagePath}`;
    const existingUrls = Array.isArray(listing.listing_image_urls)
      ? listing.listing_image_urls.filter(
          (url): url is string => typeof url === "string",
        )
      : [];
    const nextUrls = [...existingUrls, storageRef];

    const { error: urlsError } = await supabase
      .from("saved_listings")
      .update({ listing_image_urls: nextUrls })
      .eq("id", listing.id);

    if (urlsError) {
      throw new Error(urlsError.message);
    }

    return NextResponse.json({
      ok: true,
      savedListingId: listing.id,
      storagePath,
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

    return NextResponse.json(
      {
        error: storageErrorMessage(err, "Could not upload photo."),
        code: "PHOTO_UPLOAD_FAILED",
      },
      { status: 500 },
    );
  }
}

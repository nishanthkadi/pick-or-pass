import { compressImageFile } from "@/lib/saved-listings/compressImage";

const MAX_PHOTOS = 3;

/**
 * Best-effort photo uploads after the listing row exists.
 * Per photo: original → on failure compress → on failure skip.
 * Never throws — callers should not block feedback UX on this.
 */
export async function uploadListingPhotosQuietly(input: {
  savedListingId: string;
  ownerToken: string;
  files?: File[];
}): Promise<void> {
  const files = (input.files ?? []).slice(0, MAX_PHOTOS);
  if (files.length === 0) return;

  for (const file of files) {
    const uploaded = await uploadOnePhoto(input.savedListingId, input.ownerToken, file);
    if (uploaded) continue;

    try {
      const compressed = await compressImageFile(file);
      await uploadOnePhoto(input.savedListingId, input.ownerToken, compressed);
    } catch {
      // Worst case: skip this photo silently.
    }
  }
}

async function uploadOnePhoto(
  savedListingId: string,
  ownerToken: string,
  photo: File,
): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("savedListingId", savedListingId);
    formData.append("ownerToken", ownerToken);
    formData.append("photo", photo);

    const res = await fetch("/api/saved-listings/photos", {
      method: "POST",
      body: formData,
    });
    return res.ok;
  } catch {
    return false;
  }
}

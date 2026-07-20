/** Client-side resize/compress for Marketplace screenshots before upload. */
export async function compressImageFile(
  file: File,
  options?: { maxEdge?: number; quality?: number },
): Promise<File> {
  const maxEdge = options?.maxEdge ?? 1600;
  const quality = options?.quality ?? 0.72;

  if (!file.type.startsWith("image/")) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
  });

  if (!blob) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "listing-photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

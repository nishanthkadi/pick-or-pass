import type { InlineImage } from "@/lib/gemini/analyze";

export const ANALYZE_LIMITS = {
  maxImages: 3,
  maxImageBytes: 5 * 1024 * 1024,
  maxListingTextChars: 8000,
} as const;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type ParsedAnalyzeRequest = {
  listingText: string;
  images: InlineImage[];
  apiKey?: string;
};

function normalizeMimeType(type: string, filename?: string): string {
  if (ALLOWED_MIME_TYPES.has(type)) {
    return type;
  }
  const lower = filename?.toLowerCase() ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function validateImageBuffer(data: Buffer, label: string): InlineImage {
  if (data.length === 0) {
    throw new Error(`${label}: empty file`);
  }
  if (data.length > ANALYZE_LIMITS.maxImageBytes) {
    throw new Error(
      `${label}: exceeds ${ANALYZE_LIMITS.maxImageBytes / (1024 * 1024)}MB limit`,
    );
  }
  return { data, mimeType: "image/jpeg" };
}

function parseJsonImages(
  images: unknown,
): InlineImage[] {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("At least one image is required.");
  }
  if (images.length > ANALYZE_LIMITS.maxImages) {
    throw new Error(`Maximum ${ANALYZE_LIMITS.maxImages} images allowed.`);
  }

  return images.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`images[${index}]: invalid entry`);
    }
    const { data, mimeType } = item as { data?: string; mimeType?: string };
    if (!data || typeof data !== "string") {
      throw new Error(`images[${index}]: data (base64) is required`);
    }
    const buffer = Buffer.from(data, "base64");
    const validated = validateImageBuffer(buffer, `images[${index}]`);
    validated.mimeType = normalizeMimeType(mimeType ?? "image/jpeg");
    return validated;
  });
}

async function parseMultipartImages(
  formData: FormData,
): Promise<InlineImage[]> {
  const entries = [
    ...formData.getAll("images"),
    ...formData.getAll("image"),
  ];

  const files = entries.filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    throw new Error("At least one image file is required.");
  }
  if (files.length > ANALYZE_LIMITS.maxImages) {
    throw new Error(`Maximum ${ANALYZE_LIMITS.maxImages} images allowed.`);
  }

  return Promise.all(
    files.map(async (file, index) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const validated = validateImageBuffer(buffer, `images[${index}]`);
      validated.mimeType = normalizeMimeType(file.type, file.name);
      return validated;
    }),
  );
}

export async function parseAnalyzeRequest(
  req: Request,
): Promise<ParsedAnalyzeRequest> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const listingText =
      String(formData.get("listingText") ?? formData.get("text") ?? "").trim();
    const apiKeyRaw = formData.get("apiKey");
    const apiKey =
      typeof apiKeyRaw === "string" && apiKeyRaw.trim()
        ? apiKeyRaw.trim()
        : undefined;

    if (!listingText) {
      throw new Error("listingText is required.");
    }
    if (listingText.length > ANALYZE_LIMITS.maxListingTextChars) {
      throw new Error(
        `listingText exceeds ${ANALYZE_LIMITS.maxListingTextChars} characters.`,
      );
    }

    const images = await parseMultipartImages(formData);
    return { listingText, images, apiKey };
  }

  if (contentType.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;
    const listingText = String(
      body.listingText ?? body.text ?? "",
    ).trim();
    const apiKey =
      typeof body.apiKey === "string" && body.apiKey.trim()
        ? body.apiKey.trim()
        : undefined;

    if (!listingText) {
      throw new Error("listingText is required.");
    }
    if (listingText.length > ANALYZE_LIMITS.maxListingTextChars) {
      throw new Error(
        `listingText exceeds ${ANALYZE_LIMITS.maxListingTextChars} characters.`,
      );
    }

    const images = parseJsonImages(body.images);
    return { listingText, images, apiKey };
  }

  throw new Error(
    "Unsupported content type. Use multipart/form-data or application/json.",
  );
}

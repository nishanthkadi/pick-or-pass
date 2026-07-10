export type ListingContextInput = {
  listed_price_usd?: number;
  seller_star_rating?: number;
};

export function buildAnalysisListingTextFromParts(
  description: string,
  listingContext?: ListingContextInput | null,
): string {
  const parts = [description.trim()];
  const ctx = listingContext;
  if (!ctx?.listed_price_usd && ctx?.seller_star_rating == null) {
    return parts[0];
  }

  const lines = ["", "--- User-provided listing context (structured) ---"];
  if (ctx.listed_price_usd != null) {
    lines.push(`Listed price: $${ctx.listed_price_usd} USD`);
  }
  if (ctx.seller_star_rating != null) {
    lines.push(`Seller star rating: ${ctx.seller_star_rating}/5`);
  }
  lines.push(
    "(Treat as user-provided; do not invent retail prices or seller history.)",
  );
  return parts.join("\n") + lines.join("\n");
}

export function parseSellerStarRating(
  value: FormDataEntryValue | unknown,
): number | undefined {
  if (value == null || value === "") return undefined;

  const raw = typeof value === "string" ? value.trim() : String(value).trim();
  if (!raw) return undefined;

  const rating = Number(raw);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("sellerStarRating must be a number between 0 and 5.");
  }

  return rating;
}

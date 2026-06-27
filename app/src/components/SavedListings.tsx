"use client";

import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { SavedListingSource } from "@/lib/saved-listings/schema";
import type { AnalysisResult } from "@/lib/schema/analysis";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type SavedListingSummary = {
  id: string;
  source: SavedListingSource;
  listingText: string;
  listingLabel?: string;
  imageUrls: string[];
  analysis: AnalysisResult;
  grade: AnalysisResult["grade"];
  improvementReviewStatus: string;
  createdAt: string;
};

type SavedListingsProps = {
  ownerToken: string;
  onSelect: (listing: SavedListingSummary) => void;
  onBack: () => void;
};

type SavedListingsResponse = {
  listings?: SavedListingSummary[];
  error?: string;
};

export function SavedListings({
  ownerToken,
  onSelect,
  onBack,
}: SavedListingsProps) {
  const [listings, setListings] = useState<SavedListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedListings() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/saved-listings?ownerToken=${encodeURIComponent(ownerToken)}`,
        );
        const data = (await res.json()) as SavedListingsResponse;

        if (!res.ok) {
          throw new Error(data.error ?? "Could not load saved listings.");
        }

        if (!cancelled) {
          setListings(data.listings ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load saved listings.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSavedListings();

    return () => {
      cancelled = true;
    };
  }, [ownerToken]);

  return (
    <section aria-labelledby="saved-listings-heading">
      <BackLink onClick={onBack} className="mb-6" />

      <SectionHeading
        id="saved-listings-heading"
        title="Saved listings"
        description="Revisit listings and verdicts saved on this browser."
      />

      {loading && (
        <p className="mt-6 text-base text-muted" role="status">
          Loading saved listings...
        </p>
      )}

      {error && (
        <Card className="mt-6 border-grade-avoid-border">
          <CardContent>
            <p className="text-base text-grade-avoid-text">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && listings.length === 0 && (
        <Card className="mt-6">
          <CardContent>
            <p className="text-base text-muted">
              No saved listings yet. Analyze a listing, then choose
              &quot;Save listing and verdict&quot; from the results page.
            </p>
          </CardContent>
        </Card>
      )}

      {listings.length > 0 && (
        <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2">
          {listings.map((listing) => (
            <li key={listing.id}>
              <button
                type="button"
                onClick={() => onSelect(listing)}
                className={cn(
                  "h-full w-full rounded-2xl border-2 border-border bg-surface p-3 text-left shadow-sm transition",
                  "hover:border-accent hover:shadow-md",
                  "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2",
                )}
              >
                {listing.imageUrls[0] && (
                  <div className="overflow-hidden rounded-xl bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={listing.imageUrls[0]}
                      alt={`${listing.listingLabel ?? "Saved listing"} preview`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                )}
                <div className="px-1 pb-1 pt-3">
                  <p className="text-section-title text-foreground">
                    {listing.listingLabel ?? "Saved listing"}
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize text-muted">
                    {listing.grade.replace("_", " ")}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-subtle">
                    {listing.listingText}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {listings.length > 0 && (
        <Button type="button" variant="ghost" onClick={onBack} className="mt-6">
          Back to home
        </Button>
      )}
    </section>
  );
}

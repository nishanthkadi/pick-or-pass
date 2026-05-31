"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type ListingContextData = {
  label?: string;
  description: string;
  imageUrls: string[];
};

type ListingContextProps = {
  listing: ListingContextData;
  defaultOpen?: boolean;
};

const CAROUSEL_INTERVAL_MS = 4500;

function ListingPhotoCarousel({
  imageUrls,
  label,
}: {
  imageUrls: string[];
  label?: string;
}) {
  const [index, setIndex] = useState(0);
  const count = imageUrls.length;
  const hasMultiple = count > 1;

  const goTo = useCallback(
    (next: number) => {
      setIndex((next + count) % count);
    },
    [count],
  );

  useEffect(() => {
    setIndex(0);
  }, [imageUrls]);

  useEffect(() => {
    if (!hasMultiple) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, hasMultiple, imageUrls]);

  const photoLabel = label
    ? `${label} photo ${index + 1} of ${count}`
    : `Uploaded photo ${index + 1} of ${count}`;

  return (
    <div
      className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40"
      aria-roledescription={hasMultiple ? "carousel" : undefined}
      aria-label={hasMultiple ? "Listing photos" : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrls[index]}
        alt={hasMultiple ? photoLabel : label ? `${label} photo` : "Uploaded photo"}
        className="h-full w-full rounded-xl border border-border object-cover"
      />

      {hasMultiple && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/50 to-transparent px-2 pb-2 pt-6">
            <p
              className="text-center text-xs font-medium text-white"
              aria-live="polite"
            >
              {index + 1} / {count}
            </p>
          </div>

          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className={cn(
              "absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full",
              "bg-surface/90 text-foreground shadow-sm",
              "hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring",
            )}
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className={cn(
              "absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full",
              "bg-surface/90 text-foreground shadow-sm",
              "hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring",
            )}
            aria-label="Next photo"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="absolute right-2 top-2 flex gap-1" aria-hidden="true">
            {imageUrls.map((url, i) => (
              <span
                key={url}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  i === index ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ListingContext({
  listing,
  defaultOpen = true,
}: ListingContextProps) {
  const [open, setOpen] = useState(defaultOpen);
  const title = listing.label
    ? `${listing.label} — what we analyzed`
    : "Your listing";

  return (
    <section aria-labelledby="listing-context-heading">
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Card>
          <CardContent className="p-0">
            <Collapsible.Trigger
              className={cn(
                "flex w-full min-h-11 items-center justify-between gap-4 px-5 py-4 text-left",
                "hover:bg-background/50 focus-visible:rounded-t-2xl",
              )}
            >
              <SectionHeading
                id="listing-context-heading"
                eyebrow="Listing"
                title={title}
              />
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-muted transition-transform",
                  open && "rotate-180",
                )}
                aria-hidden="true"
              />
            </Collapsible.Trigger>

            <Collapsible.Content className="border-t border-border px-5 pb-5">
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <ListingPhotoCarousel
                  imageUrls={listing.imageUrls}
                  label={listing.label}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-eyebrow">Seller&apos;s description</h3>
                  <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-foreground">
                    {listing.description}
                  </p>
                </div>
              </div>
            </Collapsible.Content>
          </CardContent>
        </Card>
      </Collapsible.Root>
    </section>
  );
}

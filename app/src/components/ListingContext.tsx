"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type ListingContextData = {
  label?: string;
  description: string;
  imageUrls: string[];
};

type ListingContextProps = {
  listing: ListingContextData;
  defaultOpen?: boolean;
};

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
                <div className="flex shrink-0 flex-wrap gap-2">
                  {listing.imageUrls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt={
                        listing.label
                          ? `${listing.label} photo ${i + 1}`
                          : `Uploaded photo ${i + 1}`
                      }
                      className="h-36 w-36 rounded-xl border border-border object-cover sm:h-40 sm:w-40"
                    />
                  ))}
                </div>
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

"use client";

import { RateLimitPanel } from "@/components/RateLimitPanel";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const MAX_IMAGES = 3;

type AnalyzeFormProps = {
  listingText: string;
  onListingTextChange: (value: string) => void;
  images: File[];
  onImagesChange: (files: File[]) => void;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
  showByok: boolean;
  rateLimited: boolean;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onAnalyzeWithKey: () => void;
  onShowByok: () => void;
  onDismissByok?: () => void;
};

export function AnalyzeForm({
  listingText,
  onListingTextChange,
  images,
  onImagesChange,
  loading,
  onSubmit,
  onBack,
  showByok,
  rateLimited,
  apiKey,
  onApiKeyChange,
  onAnalyzeWithKey,
  onShowByok,
  onDismissByok,
}: AnalyzeFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);

  const canAnalyze = listingText.trim().length > 0 && images.length > 0;

  const previewUrls = useMemo(
    () => images.map((file) => URL.createObjectURL(file)),
    [images],
  );

  useEffect(() => {
    return () => {
      for (const url of previewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewUrls]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    onImagesChange(Array.from(fileList).slice(0, MAX_IMAGES));
  };

  return (
    <section aria-labelledby="analyze-heading">
      <BackLink onClick={onBack} className="mb-6" />

      <SectionHeading
        id="analyze-heading"
        eyebrow="Your listing"
        title="Check your listing"
        description="Copy the listing text from Facebook Marketplace, then upload at least one photo."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canAnalyze && !loading) onSubmit();
        }}
        className="mt-6 space-y-6"
        aria-busy={loading}
      >
        <div>
          <label
            htmlFor="listing-text"
            className="text-subsection-title text-foreground"
          >
            Listing description
          </label>
          <textarea
            id="listing-text"
            rows={6}
            required
            value={listingText}
            onChange={(e) => onListingTextChange(e.target.value)}
            placeholder="Example: Brand name, condition, what's included, pickup area…"
            className={cn(
              "mt-2 w-full rounded-xl border-2 border-border bg-surface px-4 py-3 text-base text-foreground",
              "placeholder:text-muted-subtle",
              "focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-1",
            )}
          />
        </div>

        <div>
          <label
            htmlFor={inputId}
            className="text-subsection-title text-foreground"
          >
            Listing photo
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "mt-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
              dragOver
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface",
            )}
          >
            <Upload
              className="mx-auto h-8 w-8 text-muted"
              aria-hidden="true"
            />
            <p className="mt-3 text-base font-medium text-foreground">
              Drop a photo here or choose a file
            </p>
            <p className="mt-1 text-sm text-muted">
              JPG, PNG, or WebP — up to {MAX_IMAGES} images
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => inputRef.current?.click()}
            >
              Choose file
            </Button>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              required={images.length === 0}
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
              aria-describedby={`${inputId}-hint`}
            />
            <p id={`${inputId}-hint`} className="sr-only">
              Upload at least one photo from the listing.
            </p>
          </div>

          {previewUrls.length > 0 && (
            <ul
              className="mt-3 flex list-none flex-wrap gap-2"
              aria-label="Uploaded photos"
            >
              {previewUrls.map((url, i) => (
                <li key={url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Upload preview ${i + 1}`}
                    className="h-20 w-20 rounded-lg border border-border object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {!canAnalyze && (
          <p className="text-base text-muted" role="status">
            Add both listing text and at least one photo to continue.
          </p>
        )}

        <Button
          type="submit"
          disabled={!canAnalyze || loading}
          aria-describedby={loading ? "analyze-loading" : undefined}
          className="w-full sm:w-auto sm:min-w-[220px]"
        >
          {loading ? "Checking if this trip is worth it…" : "Get my verdict"}
        </Button>
        {loading && (
          <p id="analyze-loading" className="sr-only" aria-live="polite">
            Analyzing your listing. This may take a few seconds.
          </p>
        )}

        <div className="rounded-xl border border-border bg-background px-4 py-4">
          <h3 className="text-subsection-title text-foreground">
            How free checks work
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
            <li>Sample listings are always free and instant.</li>
            <li>Live analyses use a limited number of free checks on this demo.</li>
            <li>
              After the limit, add your own free Google AI key to keep going.
            </li>
          </ul>

          {showByok || rateLimited ? (
            <div className="mt-4 border-t border-border pt-4">
              <RateLimitPanel
                rateLimited={rateLimited}
                apiKey={apiKey}
                onApiKeyChange={onApiKeyChange}
                canAnalyze={canAnalyze}
                loading={loading}
                onAnalyzeWithKey={onAnalyzeWithKey}
                onDismiss={rateLimited ? undefined : onDismissByok}
                embedded
              />
            </div>
          ) : (
            <div className="mt-4 border-t border-border pt-3">
              <Button type="button" variant="ghost" onClick={onShowByok}>
                Use your own free API key
              </Button>
            </div>
          )}
        </div>
      </form>
    </section>
  );
}

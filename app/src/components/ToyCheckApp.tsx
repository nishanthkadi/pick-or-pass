"use client";

import { AnalyzeForm } from "@/components/AnalyzeForm";
import { ExamplePicker, type DemoSummary } from "@/components/ExamplePicker";
import { LandingHero } from "@/components/LandingHero";
import type { ListingContextData } from "@/components/ListingContext";
import { PathSelector, type AppPath } from "@/components/PathSelector";
import { ResultsView } from "@/components/ResultsView";
import {
  SavedListings,
  type SavedListingSummary,
} from "@/components/SavedListings";
import { Alert } from "@/components/ui/alert";
import type { DemoListing } from "@/lib/demos/getDemo";
import { useOwnerToken } from "@/lib/saved-listings/owner-token";
import type { AnalysisResult } from "@/lib/schema/analysis";
import { useReturningVisitor } from "@/lib/use-returning-visitor";
import manifest from "@/data/demos/manifest.json";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type View = "home" | "examples" | "analyze" | "saved" | "results";
type ResultsSource = "demo" | "analyze";

type DemoApiResponse = {
  listing: DemoListing;
  analysis: AnalysisResult;
};

type ApiErrorBody = {
  error?: string;
  code?: string;
};

const DEMO_CATALOG: DemoSummary[] = Object.entries(manifest).map(
  ([id, entry]) => ({
    id,
    label: entry.label,
    description: entry.description,
    imageUrl: entry.imageUrls[0],
    photoCount: entry.imageUrls.length,
  }),
);

const BUSY_AUTO_RETRY_SECONDS = 5;

function getApiError(data: unknown): string | undefined {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as ApiErrorBody).error;
    return typeof err === "string" ? err : undefined;
  }
  return undefined;
}

function getApiErrorCode(data: unknown): string | undefined {
  if (data && typeof data === "object" && "code" in data) {
    const code = (data as ApiErrorBody).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function ToyCheckApp() {
  const {
    markVisited,
    markResultsViewed,
  } = useReturningVisitor();
  const ownerToken = useOwnerToken();

  const [view, setView] = useState<View>("home");
  const [listingText, setListingText] = useState("");
  const [sellerStarRating, setSellerStarRating] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [showByok, setShowByok] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [modelBusy, setModelBusy] = useState(false);
  const [busyRetryIn, setBusyRetryIn] = useState<number | null>(null);

  const [listingContext, setListingContext] =
    useState<ListingContextData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [resultsSource, setResultsSource] = useState<ResultsSource | null>(
    null,
  );
  const [savedListingId, setSavedListingId] = useState<string | null>(null);

  const uploadPreviewUrls = useMemo(
    () => images.map((file) => URL.createObjectURL(file)),
    [images],
  );

  const busyRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearBusyRetrySchedule = useCallback(() => {
    if (busyRetryTimerRef.current) {
      clearTimeout(busyRetryTimerRef.current);
      busyRetryTimerRef.current = null;
    }
    if (busyCountdownRef.current) {
      clearInterval(busyCountdownRef.current);
      busyCountdownRef.current = null;
    }
    setBusyRetryIn(null);
  }, []);

  useEffect(() => {
    return () => {
      clearBusyRetrySchedule();
    };
  }, [clearBusyRetrySchedule]);

  useEffect(() => {
    return () => {
      for (const url of uploadPreviewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [uploadPreviewUrls]);

  const resultsMarkedRef = useRef(false);

  useEffect(() => {
    if (view !== "results") {
      resultsMarkedRef.current = false;
      return;
    }
    if (listingContext && analysis && !resultsMarkedRef.current) {
      resultsMarkedRef.current = true;
      markResultsViewed();
    }
  }, [view, listingContext, analysis, markResultsViewed]);

  useEffect(() => {
    if (view !== "results" || resultsSource !== "demo" || !listingContext) {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view, resultsSource, listingContext]);

  const resetError = () => {
    setError(null);
    setRateLimited(false);
    setModelBusy(false);
    clearBusyRetrySchedule();
  };

  const goHome = () => {
    resetError();
    setResultsSource(null);
    setSavedListingId(null);
    setView("home");
    setShowByok(false);
  };

  const goResultsFromDemo = useCallback(async (id: string) => {
    resetError();
    setLoading(true);
    setListingContext(null);
    setAnalysis(null);
    markVisited();

    try {
      const res = await fetch(`/api/demo/${id}`);
      const data = (await res.json()) as DemoApiResponse | ApiErrorBody;
      if (!res.ok) {
        throw new Error(getApiError(data) ?? "Could not load sample listing.");
      }
      const demo = data as DemoApiResponse;
      setListingContext({
        label: demo.listing.label,
        description: demo.listing.description,
        imageUrls: demo.listing.imageUrls,
      });
      setAnalysis(demo.analysis);
      setResultsSource("demo");
      setSavedListingId(null);
      setView("results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load sample listing.",
      );
    } finally {
      setLoading(false);
    }
  }, [markVisited]);

  const runAnalyze = async (
    byokKey?: string,
    options?: { isAutoRetry?: boolean },
  ) => {
    clearBusyRetrySchedule();
    resetError();
    setLoading(true);
    setListingContext(null);
    setAnalysis(null);
    markVisited();

    const formData = new FormData();
    formData.append("listingText", listingText.trim());
    const ratingTrimmed = sellerStarRating.trim();
    if (ratingTrimmed) {
      formData.append("sellerStarRating", ratingTrimmed);
    }
    for (const file of images) {
      formData.append("images", file);
    }
    const key = byokKey?.trim() || apiKey.trim();
    if (key) {
      formData.append("apiKey", key);
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as AnalysisResult | ApiErrorBody;
      const errorCode = getApiErrorCode(data);

      if (res.status === 429) {
        setRateLimited(true);
        setShowByok(true);
        throw new Error(
          getApiError(data) ??
            "AI quota or free-check limit hit. Try a sample listing or add your API key.",
        );
      }

      if (res.status === 503 && errorCode === "MODEL_BUSY") {
        const busyMessage =
          getApiError(data) ??
          "The AI is busy right now. Try again in a moment, or use a sample listing.";
        setModelBusy(true);
        setError(busyMessage);

        if (!options?.isAutoRetry) {
          setBusyRetryIn(BUSY_AUTO_RETRY_SECONDS);
          busyCountdownRef.current = setInterval(() => {
            setBusyRetryIn((current) => {
              if (current == null || current <= 1) {
                if (busyCountdownRef.current) {
                  clearInterval(busyCountdownRef.current);
                  busyCountdownRef.current = null;
                }
                return null;
              }
              return current - 1;
            });
          }, 1000);
          busyRetryTimerRef.current = setTimeout(() => {
            void runAnalyze(byokKey, { isAutoRetry: true });
          }, BUSY_AUTO_RETRY_SECONDS * 1000);
        }
        return;
      }

      if (!res.ok) {
        throw new Error(
          getApiError(data) ??
            "Something went wrong. Try again or upload a clearer photo.",
        );
      }

      setListingContext({
        description: listingText.trim(),
        imageUrls: [...uploadPreviewUrls],
        sellerStarRating: ratingTrimmed
          ? Number(ratingTrimmed)
          : undefined,
      });
      setAnalysis(data as AnalysisResult);
      setResultsSource("analyze");
      setSavedListingId(null);
      setView("results");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Try again or upload a clearer photo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePathSelect = (path: AppPath) => {
    resetError();
    markVisited();
    setView(path);
  };

  const openSavedListing = (saved: SavedListingSummary) => {
    resetError();
    setListingContext({
      label: saved.listingLabel,
      description: saved.listingText,
      imageUrls: saved.imageUrls,
    });
    setAnalysis(saved.analysis);
    setResultsSource(saved.source);
    setSavedListingId(saved.id);
    setView("results");
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-7">
      {view === "home" && (
        <>
          <LandingHero />
          <PathSelector onSelect={handlePathSelect} />
        </>
      )}

      {view === "examples" && (
        <ExamplePicker
          demos={DEMO_CATALOG}
          loading={loading}
          onSelect={(id) => void goResultsFromDemo(id)}
          onBack={goHome}
        />
      )}

      {view === "analyze" && (
        <AnalyzeForm
          listingText={listingText}
          onListingTextChange={(v) => {
            resetError();
            setListingText(v);
          }}
          sellerStarRating={sellerStarRating}
          onSellerStarRatingChange={(v) => {
            resetError();
            setSellerStarRating(v);
          }}
          images={images}
          onImagesChange={(files) => {
            resetError();
            setImages(files);
          }}
          loading={loading}
          onSubmit={() => void runAnalyze()}
          onBack={goHome}
          showByok={showByok}
          rateLimited={rateLimited}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          onAnalyzeWithKey={() => void runAnalyze(apiKey)}
          onShowByok={() => setShowByok(true)}
          onDismissByok={() => setShowByok(false)}
        />
      )}

      {view === "saved" && (
        <SavedListings
          ownerToken={ownerToken}
          onSelect={openSavedListing}
          onBack={goHome}
        />
      )}

      {view === "results" && listingContext && analysis && resultsSource && (
        <ResultsView
          listing={listingContext}
          analysis={analysis}
          feedbackContext={{
            source: resultsSource,
            listingLabel: listingContext.label,
            listingDescription: listingContext.description,
            imageUrls: listingContext.imageUrls,
            imageCount: listingContext.imageUrls.length,
            imageFiles: resultsSource === "analyze" ? images : undefined,
            savedListingId: savedListingId ?? undefined,
          }}
          onBack={goHome}
        />
      )}

      {loading && view !== "analyze" && (
        <div
          className="mt-6 space-y-1 text-center"
          role="status"
          aria-live="polite"
        >
          <p className="text-base text-muted">
            Checking if this trip is worth it…
          </p>
          <p className="text-sm text-muted">
            Photo checks can take up to a minute — hang tight.
          </p>
        </div>
      )}

      {error && (
        <Alert variant="error" className="mt-6">
          <div className="space-y-3">
            <p>{error}</p>
            {modelBusy && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted">
                  {busyRetryIn != null
                    ? `Retrying automatically in ${busyRetryIn}s…`
                    : "Your listing and photos are still here."}
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    clearBusyRetrySchedule();
                    void runAnalyze();
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </Alert>
      )}
    </div>
  );
}

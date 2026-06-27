"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FeedbackIssueTag } from "@/lib/feedback/schema";
import { useOwnerToken } from "@/lib/saved-listings/owner-token";
import type { SavedListingSource } from "@/lib/saved-listings/schema";
import type { AnalysisResult } from "@/lib/schema/analysis";
import { cn } from "@/lib/utils";
import { useId, useState } from "react";

type Helpfulness = "helpful" | "not_helpful";
type GradeAccuracy = "right" | "wrong" | "not_sure" | "not_contacted";

export type FeedbackContext = {
  source: SavedListingSource;
  listingLabel?: string;
  listingDescription?: string;
  imageUrls: string[];
  imageCount: number;
  imageFiles?: File[];
  savedListingId?: string;
};

type FeedbackCardProps = {
  analysis: AnalysisResult;
  context: FeedbackContext;
};

const issueOptions: Array<{ value: FeedbackIssueTag; label: string }> = [
  { value: "grade_wrong", label: "Grade seemed wrong" },
  { value: "missed_damage", label: "Missed visible damage" },
  { value: "missed_missing_parts", label: "Missed missing parts" },
  { value: "too_cautious", label: "Too cautious" },
  { value: "too_confident", label: "Too confident" },
  { value: "unclear_reasoning", label: "Reasoning unclear" },
  { value: "seller_questions_unhelpful", label: "Seller questions not useful" },
  { value: "other", label: "Other" },
];

const accuracyOptions: Array<{ value: GradeAccuracy; label: string }> = [
  { value: "not_contacted", label: "I have not contacted or visited yet" },
  { value: "right", label: "The grade seems right" },
  { value: "wrong", label: "The grade seems wrong" },
  { value: "not_sure", label: "I am not sure yet" },
];

async function getApiError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export function FeedbackCard({ analysis, context }: FeedbackCardProps) {
  const commentId = useId();
  const improvementConsentId = useId();
  const ownerToken = useOwnerToken();
  const [savedListingId, setSavedListingId] = useState<string | null>(
    context.savedListingId ?? null,
  );
  const [allowImprovementUse, setAllowImprovementUse] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [helpfulness, setHelpfulness] = useState<Helpfulness | null>(null);
  const [gradeAccuracy, setGradeAccuracy] =
    useState<GradeAccuracy>("not_contacted");
  const [issueTags, setIssueTags] = useState<FeedbackIssueTag[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleIssue = (tag: FeedbackIssueTag) => {
    setIssueTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag].slice(0, 5),
    );
  };

  const saveListing = async () => {
    if (savingListing || savedListingId) return;

    setSavingListing(true);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append(
        "payload",
        JSON.stringify({
          ownerToken,
          source: context.source,
          listingText: context.listingDescription,
          listingLabel: context.listingLabel,
          listingImageUrls: context.source === "demo" ? context.imageUrls : [],
          analysis,
          allowImprovementUse,
        }),
      );

      for (const file of context.imageFiles ?? []) {
        formData.append("photos", file);
      }

      const res = await fetch("/api/saved-listings", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(
          await getApiError(res, "Could not save this listing."),
        );
      }

      const data = (await res.json()) as { savedListingId?: string };
      if (!data.savedListingId) {
        throw new Error("Saved listing response was missing an id.");
      }

      setSavedListingId(data.savedListingId);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save this listing.",
      );
    } finally {
      setSavingListing(false);
    }
  };

  const submitFeedback = async () => {
    if (!helpfulness || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedListingId: savedListingId ?? undefined,
          ownerToken,
          helpfulness,
          gradeAccuracy,
          issueTags,
          comment: comment.trim() || undefined,
          metadata: {
            source: context.source,
            listingLabel: context.listingLabel,
            listingDescription: context.listingDescription,
            imageCount: context.imageCount,
            analysis: {
              grade: analysis.grade,
              grade_label: analysis.grade_label,
              text_photo_alignment: analysis.text_photo_alignment,
              visit_summary: analysis.visit_summary,
            },
          },
        }),
      });

      if (!res.ok) {
        throw new Error(
          await getApiError(res, "Could not save feedback. Please try again."),
        );
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save feedback.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-7">
        <section aria-labelledby="save-listing-heading">
          <h2 id="save-listing-heading" className="text-section-title text-foreground">
            Save this listing and verdict
          </h2>
          <p className="mt-2 text-base text-muted">
            Keep the listing photos, text, and verdict so you can revisit it
            later.
          </p>
          {context.source === "demo" && (
            <p className="mt-2 text-sm text-muted">
              Sample listings save the verdict and listing text; their photos
              stay as public demo assets.
            </p>
          )}

          <label
            htmlFor={improvementConsentId}
            className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-muted"
          >
            <input
              id={improvementConsentId}
              type="checkbox"
              checked={allowImprovementUse}
              onChange={(event) =>
                setAllowImprovementUse(event.target.checked)
              }
              disabled={Boolean(savedListingId) || savingListing}
              className="mt-1 h-4 w-4 accent-foreground"
            />
            Also allow this saved listing to help improve Pick or Pass after
            review.
          </label>

          {savedListingId ? (
            <p className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
              Saved. Feedback you share below will be tied to this listing.
            </p>
          ) : (
            <Button
              type="button"
              className="mt-5 w-full sm:w-auto"
              disabled={savingListing}
              onClick={() => void saveListing()}
            >
              {savingListing ? "Saving listing..." : "Save listing and verdict"}
            </Button>
          )}

          {saveError && (
            <p className="mt-3 text-sm font-medium text-grade-avoid-text">
              {saveError}
            </p>
          )}
        </section>

        <section
          aria-labelledby="share-feedback-heading"
          className="border-t border-border pt-6"
        >
          <h2
            id="share-feedback-heading"
            className="text-section-title text-foreground"
          >
            Share feedback
          </h2>
        <p className="mt-2 text-base text-muted">
            Tell us what worked or felt off. Feedback helps improve future
            verdicts.
          </p>

          {submitted ? (
            <p className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
              Thanks. Your feedback is saved for product improvement and review.
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant={helpfulness === "helpful" ? "primary" : "secondary"}
                  onClick={() => setHelpfulness("helpful")}
                  className="flex-1"
                >
                  Helpful
                </Button>
                <Button
                  type="button"
                  variant={
                    helpfulness === "not_helpful" ? "primary" : "secondary"
                  }
                  onClick={() => setHelpfulness("not_helpful")}
                  className="flex-1"
                >
                  Not helpful
                </Button>
              </div>

              <fieldset className="mt-5">
                <legend className="text-subsection-title text-foreground">
                  Was the grade right?
                </legend>
                <div className="mt-2 space-y-2">
                  {accuracyOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-sm text-muted"
                    >
                      <input
                        type="radio"
                        name="grade-accuracy"
                        value={option.value}
                        checked={gradeAccuracy === option.value}
                        onChange={() => setGradeAccuracy(option.value)}
                        className="h-4 w-4 accent-foreground"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-5">
                <legend className="text-subsection-title text-foreground">
                  What felt off?
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {issueOptions.map((option) => {
                    const selected = issueTags.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleIssue(option.value)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                          selected
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-muted hover:border-accent",
                        )}
                        aria-pressed={selected}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-5">
                <label
                  htmlFor={commentId}
                  className="text-subsection-title text-foreground"
                >
                  Optional note
                </label>
                <textarea
                  id={commentId}
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={700}
                  placeholder="What did the model miss, overstate, or make easier?"
                  className={cn(
                    "mt-2 w-full rounded-xl border-2 border-border bg-surface px-4 py-3 text-base text-foreground",
                    "placeholder:text-muted-subtle",
                    "focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-1",
                  )}
                />
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted">
                We save your feedback, verdict, and listing text for product
                improvement. Photos are only saved if you choose to save the
                listing above.
              </p>

              {error && (
                <p className="mt-3 text-sm font-medium text-grade-avoid-text">
                  {error}
                </p>
              )}

              <Button
                type="button"
                className="mt-5 w-full sm:w-auto"
                disabled={!helpfulness || submitting}
                onClick={() => void submitFeedback()}
              >
                {submitting ? "Saving feedback..." : "Submit feedback"}
              </Button>
            </>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

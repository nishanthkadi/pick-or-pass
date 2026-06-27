"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { FeedbackIssueTag } from "@/lib/feedback/schema";
import { useOwnerToken } from "@/lib/saved-listings/owner-token";
import type { SavedListingSource } from "@/lib/saved-listings/schema";
import type { AnalysisResult } from "@/lib/schema/analysis";
import { cn } from "@/lib/utils";
import { Bookmark, Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { useId, useState } from "react";

type Helpfulness = "helpful" | "not_helpful";

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

async function getApiError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

function getResultKey(context: FeedbackContext, analysis: AnalysisResult) {
  const raw = [
    context.source,
    context.listingLabel ?? "",
    context.listingDescription ?? "",
    context.imageUrls.join("|"),
    analysis.grade,
    analysis.text_photo_alignment,
    analysis.visit_summary,
  ].join("::");

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }

  return `${context.source}-${hash.toString(36)}`;
}

export function FeedbackCard({ analysis, context }: FeedbackCardProps) {
  const noteId = useId();
  const improveId = useId();
  const ownerToken = useOwnerToken();
  const [savedListingId, setSavedListingId] = useState<string | null>(
    context.savedListingId ?? null,
  );
  const [userSaved, setUserSaved] = useState(Boolean(context.savedListingId));
  const [allowImprovementUse, setAllowImprovementUse] = useState(true);
  const [savingListing, setSavingListing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [helpfulness, setHelpfulness] = useState<Helpfulness | null>(null);
  const [issueTags, setIssueTags] = useState<FeedbackIssueTag[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultKey = getResultKey(context, analysis);

  const toggleIssue = (tag: FeedbackIssueTag) => {
    setIssueTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag].slice(0, 5),
    );
  };

  const saveListing = async ({
    saveForUser,
    improvementUse,
  }: {
    saveForUser: boolean;
    improvementUse: boolean;
  }) => {
    if (savingListing || (savedListingId && saveForUser && userSaved)) {
      return savedListingId;
    }

    setSavingListing(true);
    setSaveError(null);

    try {
      if (savedListingId && saveForUser && !userSaved) {
        const res = await fetch("/api/saved-listings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            savedListingId,
            ownerToken,
            allowImprovementUse: improvementUse,
          }),
        });

        if (!res.ok) {
          throw new Error(
            await getApiError(res, "Could not save this listing."),
          );
        }

        setUserSaved(true);
        return savedListingId;
      }

      const formData = new FormData();
      formData.append(
        "payload",
        JSON.stringify({
          ownerToken,
          resultKey,
          source: context.source,
          listingText: context.listingDescription,
          listingLabel: context.listingLabel,
          listingImageUrls: context.source === "demo" ? context.imageUrls : [],
          analysis,
          userSaved: saveForUser,
          allowImprovementUse: improvementUse,
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
      setUserSaved(saveForUser);
      return data.savedListingId;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save this listing.";
      setSaveError(message);
      throw new Error(message);
    } finally {
      setSavingListing(false);
    }
  };

  const submitFeedback = async (value: Helpfulness) => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setHelpfulness(value);

    try {
      const linkedListingId =
        savedListingId ??
        (await saveListing({
          saveForUser: false,
          improvementUse: true,
        }));

      if (!linkedListingId) {
        throw new Error("Could not link feedback to this listing.");
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedListingId: linkedListingId,
          ownerToken,
          helpfulness: value,
          issueTags: value === "not_helpful" ? issueTags : [],
          comment:
            value === "not_helpful" && comment.trim()
              ? comment.trim()
              : undefined,
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

  const saveTitle =
    "Keep the listing photos, text, and verdict so you can revisit it later.";

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              title={saveTitle}
              aria-label="Save this listing and verdict"
              disabled={savingListing || userSaved}
              onClick={() =>
                void saveListing({
                  saveForUser: true,
                  improvementUse: allowImprovementUse,
                })
              }
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors",
                "hover:border-accent hover:bg-accent-soft",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                "disabled:cursor-not-allowed disabled:opacity-70",
              )}
            >
              {userSaved ? (
                <Check className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Bookmark className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <span className="text-sm font-medium text-foreground">
              {userSaved ? "Saved" : "Save listing"}
            </span>
          </div>

          <label
            htmlFor={improveId}
            className="flex items-center gap-2 text-sm text-muted"
            title="Allow this saved listing to help improve Pick or Pass after review."
          >
            <input
              id={improveId}
              type="checkbox"
              checked={allowImprovementUse}
              onChange={(event) =>
                setAllowImprovementUse(event.target.checked)
              }
              disabled={savingListing || userSaved}
              className="h-4 w-4 accent-foreground"
            />
            Improve app
          </label>
        </div>

        {saveError && (
          <p className="text-sm font-medium text-grade-avoid-text">
            {saveError}
          </p>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-foreground">
              Was this useful?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                title="This was useful"
                aria-label="This was useful"
                disabled={submitting}
                onClick={() => void submitFeedback("helpful")}
                className={feedbackButtonClass(helpfulness === "helpful")}
              >
                <ThumbsUp className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                title="This was not useful"
                aria-label="This was not useful"
                disabled={submitting}
                onClick={() => {
                  setHelpfulness("not_helpful");
                  setSubmitted(false);
                  setError(null);
                }}
                className={feedbackButtonClass(helpfulness === "not_helpful")}
              >
                <ThumbsDown className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {helpfulness === "not_helpful" && (
            <div className="mt-4 space-y-4">
              <fieldset>
                <legend className="text-sm font-medium text-foreground">
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

              <div>
                <label
                  htmlFor={noteId}
                  className="text-sm font-medium text-foreground"
                >
                  Optional note
                </label>
                <textarea
                  id={noteId}
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={700}
                  placeholder="What did the model miss or overstate?"
                  className={cn(
                    "mt-2 w-full rounded-xl border-2 border-border bg-surface px-4 py-3 text-base text-foreground",
                    "placeholder:text-muted-subtle",
                    "focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-1",
                  )}
                />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitFeedback("not_helpful")}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-5 py-2.5 text-base font-semibold text-background transition-colors",
                  "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                )}
              >
                {submitting
                  ? "Saving..."
                  : submitted
                    ? "Update feedback"
                    : "Send feedback"}
              </button>
            </div>
          )}

          {submitted && (
            <p className="mt-3 text-sm font-medium text-foreground">
              Feedback saved. You can change it anytime.
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm font-medium text-grade-avoid-text">
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function feedbackButtonClass(selected: boolean) {
  return cn(
    "inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
    selected
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-background text-muted hover:border-accent hover:text-foreground",
  );
}

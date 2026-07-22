import { AnalysisDetails } from "@/components/AnalysisDetails";
import {
  FeedbackCard,
  type FeedbackContext,
} from "@/components/FeedbackCard";
import {
  ListingContext,
  type ListingContextData,
} from "@/components/ListingContext";
import { BackLink } from "@/components/ui/back-link";
import type { AnalysisResult } from "@/lib/schema/analysis";

type ResultsViewProps = {
  listing: ListingContextData;
  analysis: AnalysisResult;
  feedbackContext: FeedbackContext;
  onBack: () => void;
};

export function ResultsView({
  listing,
  analysis,
  feedbackContext,
  onBack,
}: ResultsViewProps) {
  return (
    <section aria-labelledby="results-page-title">
      <h1 id="results-page-title" className="sr-only">
        Analysis results
      </h1>

      <div className="mb-6">
        <BackLink onClick={onBack} />
      </div>

      <div className="space-y-4">
        <ListingContext listing={listing} defaultOpen={false} />
        <AnalysisDetails result={analysis} />
        {(feedbackContext.source === "analyze" ||
          Boolean(feedbackContext.savedListingId)) && (
          <FeedbackCard analysis={analysis} context={feedbackContext} />
        )}
      </div>
    </section>
  );
}

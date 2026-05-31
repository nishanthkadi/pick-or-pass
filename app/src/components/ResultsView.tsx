import { AnalysisDetails } from "@/components/AnalysisDetails";
import {
  ListingContext,
  type ListingContextData,
} from "@/components/ListingContext";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { VerdictCard } from "@/components/VerdictCard";
import type { AnalysisResult } from "@/lib/schema/analysis";

type ResultsViewProps = {
  listing: ListingContextData;
  analysis: AnalysisResult;
  collapseListing?: boolean;
  onBack: () => void;
  onTryAnother: () => void;
};

export function ResultsView({
  listing,
  analysis,
  collapseListing = false,
  onBack,
  onTryAnother,
}: ResultsViewProps) {
  return (
    <section aria-labelledby="results-page-title">
      <h1 id="results-page-title" className="sr-only">
        Analysis results
      </h1>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <BackLink onClick={onBack} />
        <Button type="button" variant="ghost" onClick={onTryAnother}>
          Try another listing
        </Button>
      </div>

      <div className="space-y-6">
        <VerdictCard result={analysis} />
        <ListingContext
          listing={listing}
          defaultOpen={!collapseListing}
        />
        <AnalysisDetails result={analysis} />
      </div>
    </section>
  );
}

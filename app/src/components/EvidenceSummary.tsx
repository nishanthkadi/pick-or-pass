"use client";

import { deriveEvidenceSummary } from "@/lib/analysis/deriveEvidenceSummary";
import type { AnalysisResult } from "@/lib/schema/analysis";
import { cn } from "@/lib/utils";

type EvidenceSummaryProps = {
  result: AnalysisResult;
};

function EvidenceSection({
  title,
  items,
  emptyLabel,
  emphasized = false,
}: {
  title: string;
  items: string[];
  emptyLabel?: string;
  emphasized?: boolean;
}) {
  if (items.length === 0 && !emptyLabel) {
    return null;
  }

  return (
    <div
      className={cn(
        emphasized && "rounded-xl border border-border bg-background px-3 py-3",
      )}
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-subtle">{emptyLabel}</p>
      )}
    </div>
  );
}

export function EvidenceSummary({ result }: EvidenceSummaryProps) {
  const evidence = deriveEvidenceSummary(result);
  const emphasizeUnknowns = result.grade === "not_sure";

  return (
    <div className="space-y-4 border-b border-border px-4 py-4 sm:px-5">
      <div>
        <p className="text-sm font-semibold text-foreground">Confidence</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {evidence.confidenceSummary}
        </p>
      </div>

      <EvidenceSection
        title="Seen in photos"
        items={evidence.seenInPhotos}
        emptyLabel="No clear photo-based evidence surfaced."
      />

      <EvidenceSection
        title="Claimed in text"
        items={evidence.claimedInText}
        emptyLabel="No clear text-based claims surfaced."
      />

      <EvidenceSection
        title="Still unknown"
        items={evidence.unknowns}
        emphasized={emphasizeUnknowns}
      />

      {evidence.whatWouldChangeVerdict.length > 0 && (
        <div
          className={cn(
            emphasizeUnknowns &&
              "rounded-xl border border-border bg-background px-3 py-3",
          )}
        >
          <h3 className="text-sm font-semibold text-foreground">
            What would change this verdict
          </h3>
          <p className="mt-1 text-sm text-muted-subtle">
            {evidence.changeVerdictIntro}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
            {evidence.whatWouldChangeVerdict.map((item, index) => (
              <li key={`change-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

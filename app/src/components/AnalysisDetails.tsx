"use client";

import {
  AccordionItem,
  AccordionRoot,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { AnalysisResult } from "@/lib/schema/analysis";
import { useState } from "react";

const ALIGNMENT_LABELS = {
  matches: "Matches",
  partially_matches: "Partially matches",
  contradicts: "Contradicts",
  insufficient_text: "Insufficient text",
} as const;

export function AnalysisDetails({ result }: { result: AnalysisResult }) {
  const [copied, setCopied] = useState(false);
  const topReasons = result.reasons.slice(0, 3);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(result.seller_message_draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section aria-labelledby="details-heading">
      <SectionHeading
        id="details-heading"
        eyebrow="Details"
        title="More about this analysis"
        description="Expand a section for reasons, seller questions, and limits. Start with the verdict above."
      />

      <Card className="mt-4">
        <CardContent className="px-5 py-0">
          <AccordionRoot defaultValue={[]}>
            <AccordionItem value="why" title="Why this grade">
              <ul className="space-y-2">
                {topReasons.map((reason, i) => (
                  <li key={i}>{reason.text}</li>
                ))}
              </ul>
              {result.reasons.length > 3 && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-medium text-accent">
                    Show all {result.reasons.length} reasons
                  </summary>
                  <ul className="mt-2 space-y-2 text-muted">
                    {result.reasons.slice(3).map((reason, i) => (
                      <li key={i}>{reason.text}</li>
                    ))}
                  </ul>
                </details>
              )}
            </AccordionItem>

            <AccordionItem value="questions" title="Questions to ask the seller">
              <ul className="list-disc space-y-1 pl-5">
                {result.seller_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
              {result.seller_message_draft && (
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void copyMessage()}
                    aria-live="polite"
                  >
                    {copied ? "Copied to clipboard" : "Copy message to seller"}
                  </Button>
                </div>
              )}
            </AccordionItem>

            <AccordionItem value="alignment" title="Text vs photo check">
              <p className="font-semibold">
                {ALIGNMENT_LABELS[result.text_photo_alignment]}
              </p>
              <p className="mt-2 text-muted">{result.alignment_summary}</p>
              {result.mismatches.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {result.mismatches.map((m, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-warning-text"
                    >
                      {m.issue}
                    </li>
                  ))}
                </ul>
              )}
            </AccordionItem>

            <AccordionItem value="limitations" title="What we can't tell from this listing">
              <ul className="list-disc space-y-1 pl-5 text-muted">
                {result.limitations.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </AccordionItem>

            <AccordionItem value="research" title="Research before you go">
              <ul className="list-disc space-y-1 pl-5 text-muted">
                {result.research_recommended.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-base italic text-muted">
                {result.future_capability_note}
              </p>
            </AccordionItem>
          </AccordionRoot>
        </CardContent>
      </Card>
    </section>
  );
}

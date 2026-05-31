"use client";

import {
  AccordionItem,
  AccordionRoot,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { VerdictSummary } from "@/components/VerdictCard";
import type { AnalysisResult } from "@/lib/schema/analysis";
import { useState } from "react";

export function AnalysisDetails({ result }: { result: AnalysisResult }) {
  const [copied, setCopied] = useState(false);

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
        title="Verdict details"
        description="Expand a section for reasons, seller questions, and limits."
      />

      <Card className="mt-3 overflow-hidden">
        <VerdictSummary result={result} embedded />
        <CardContent className="px-5 py-0">
          <AccordionRoot defaultValue={[]}>
            <AccordionItem value="why" title="Why this grade">
              <ul className="list-disc space-y-1 pl-5">
                {result.reasons.map((reason, i) => (
                  <li key={i}>{reason.text}</li>
                ))}
              </ul>
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

            <AccordionItem value="limitations" title="What we can't tell from this listing">
              <ul className="list-disc space-y-1 pl-5">
                {result.limitations.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </AccordionItem>

            <AccordionItem value="research" title="Research before you go">
              <ul className="list-disc space-y-1 pl-5">
                {result.research_recommended.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm italic">
                {result.future_capability_note}
              </p>
            </AccordionItem>
          </AccordionRoot>
        </CardContent>
      </Card>
    </section>
  );
}

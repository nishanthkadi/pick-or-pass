import type { AnalysisResult } from "@/lib/schema/analysis";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

const GRADE_CONFIG = {
  good: {
    container: "bg-grade-good-bg border-grade-good-border",
    badge: "bg-grade-good-badge text-white",
    text: "text-grade-good-text",
    icon: CheckCircle2,
    iconLabel: "Good verdict",
  },
  not_sure: {
    container: "bg-grade-unsure-bg border-grade-unsure-border",
    badge: "bg-grade-unsure-badge text-white",
    text: "text-grade-unsure-text",
    icon: HelpCircle,
    iconLabel: "Not sure verdict",
  },
  avoid: {
    container: "bg-grade-avoid-bg border-grade-avoid-border",
    badge: "bg-grade-avoid-badge text-white",
    text: "text-grade-avoid-text",
    icon: AlertTriangle,
    iconLabel: "Avoid verdict",
  },
} as const;

type VerdictSummaryProps = {
  result: AnalysisResult;
  /** Embedded at top of Verdict details card */
  embedded?: boolean;
};

export function VerdictSummary({
  result,
  embedded = false,
}: VerdictSummaryProps) {
  const config = GRADE_CONFIG[result.grade];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        embedded
          ? cn("border-b px-4 py-3.5 sm:px-5", config.container)
          : cn("rounded-2xl border-2 p-6", config.container),
      )}
      aria-labelledby="verdict-heading"
    >
      <h2
        id="verdict-heading"
        className={cn(
          embedded ? "sr-only" : "text-eyebrow text-muted",
        )}
      >
        Verdict
      </h2>

      <div
        className={cn(
          "flex items-start gap-2.5",
          !embedded && "mt-3",
        )}
      >
        <Icon
          className={cn(
            "shrink-0",
            embedded ? "mt-0.5 h-5 w-5" : "h-8 w-8",
            config.text,
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full font-bold",
              config.badge,
              embedded
                ? "min-h-8 px-3 py-1 text-sm"
                : "min-h-11 px-4 py-2 text-base",
            )}
          >
            <span className="sr-only">{config.iconLabel}: </span>
            {result.grade_label}
          </span>
          <p
            className={cn(
              "leading-snug",
              embedded
                ? "mt-2 text-sm sm:text-base"
                : "mt-4 text-section-title",
              config.text,
            )}
          >
            {result.visit_summary}
          </p>
        </div>
      </div>
    </div>
  );
}

export function VerdictCard({ result }: { result: AnalysisResult }) {
  return <VerdictSummary result={result} />;
}

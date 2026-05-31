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

export function VerdictCard({ result }: { result: AnalysisResult }) {
  const config = GRADE_CONFIG[result.grade];
  const Icon = config.icon;

  return (
    <section
      className={cn("rounded-2xl border-2 p-6", config.container)}
      aria-labelledby="verdict-heading"
    >
      <h2 id="verdict-heading" className="text-eyebrow text-muted">
        Verdict
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Icon
          className={cn("h-8 w-8 shrink-0", config.text)}
          aria-hidden="true"
        />
        <span
          className={cn(
            "inline-flex min-h-11 items-center rounded-full px-4 py-2 text-base font-bold",
            config.badge,
          )}
        >
          <span className="sr-only">{config.iconLabel}: </span>
          {result.grade_label}
        </span>
      </div>

      <p
        className={cn(
          "mt-4 text-section-title leading-snug",
          config.text,
        )}
      >
        {result.visit_summary}
      </p>
    </section>
  );
}

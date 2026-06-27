import { SectionDivider } from "@/components/ui/section-divider";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export type AppPath = "examples" | "analyze" | "saved";

type PathSelectorProps = {
  onSelect: (path: AppPath) => void;
};

export function PathSelector({ onSelect }: PathSelectorProps) {
  return (
    <section aria-labelledby="path-heading">
      <SectionDivider
        title="Get started"
        id="path-heading"
        align="center"
        compact
        prominent
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PathCard
          onClick={() => onSelect("examples")}
          eyebrow="See how it works"
          title="Try a sample listing"
          description="Browse example listings and see a full analysis — no account needed."
          cta="View sample listings"
        />
        <PathCard
          onClick={() => onSelect("analyze")}
          eyebrow="Your listing"
          title="Check your listing"
          description="Paste text and upload a photo from a listing you're considering."
          cta="Analyze my listing"
        />
      </div>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => onSelect("saved")}
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-medium text-muted underline underline-offset-4",
            "hover:text-foreground",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
          )}
        >
          Saved listings
        </button>
      </div>
    </section>
  );
}

function PathCard({
  onClick,
  eyebrow,
  title,
  description,
  cta,
}: {
  onClick: () => void;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border-2 border-border bg-surface p-6 text-left shadow-sm",
        "transition hover:border-accent hover:shadow-md",
        "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2",
      )}
    >
      <p className="text-eyebrow text-accent">{eyebrow}</p>
      <p className="mt-2 text-section-title text-foreground">{title}</p>
      <p className="mt-2 text-base leading-relaxed text-muted">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-base font-semibold text-accent group-hover:underline">
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  );
}

import { BackLink } from "@/components/ui/back-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

export type DemoSummary = {
  id: string;
  label: string;
  description: string;
  imageUrl: string;
  hint: string;
};

type ExamplePickerProps = {
  demos: DemoSummary[];
  loading: boolean;
  onSelect: (id: string) => void;
  onBack: () => void;
};

export function ExamplePicker({
  demos,
  loading,
  onSelect,
  onBack,
}: ExamplePickerProps) {
  return (
    <section aria-labelledby="examples-heading">
      <BackLink onClick={onBack} className="mb-6" />

      <SectionHeading
        id="examples-heading"
        eyebrow="Samples"
        title="Sample listings"
        description="Pick one to see the listing details and analysis."
      />

      <ul className="mt-6 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {demos.map((demo) => (
          <li key={demo.id}>
            <button
              type="button"
              disabled={loading}
              aria-busy={loading}
              onClick={() => onSelect(demo.id)}
              className={cn(
                "h-full w-full rounded-2xl border-2 border-border bg-surface p-3 text-left shadow-sm transition",
                "hover:border-accent hover:shadow-md",
                "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <div className="overflow-hidden rounded-xl bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={demo.imageUrl}
                  alt={`${demo.label} preview`}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="px-1 pb-1 pt-3">
                <p className="text-section-title text-foreground">{demo.label}</p>
                <p className="mt-1 text-sm text-muted">{demo.hint}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-subtle">
                  {demo.description}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

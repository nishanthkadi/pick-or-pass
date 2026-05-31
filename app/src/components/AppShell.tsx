import { SectionDivider } from "@/components/ui/section-divider";
import { Store } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="min-w-0 leading-snug">
            <span className="text-brand-name">Pick or Pass</span>
            <span className="text-brand-tagline"> on Facebook Marketplace</span>
          </p>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
            aria-hidden="true"
          >
            <Store className="h-5 w-5" strokeWidth={2.25} />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>

      <footer className="mt-auto border-t border-border bg-surface">
        <div className="mx-auto max-w-2xl px-4 pb-10 sm:px-6">
          <SectionDivider
            title="About Pick or Pass"
            id="about-heading"
            compact
            prominent
          />

          <div className="mt-5 space-y-5 text-sm leading-relaxed text-muted">
            <div>
              <h3 className="text-eyebrow">Purpose</h3>
              <p className="mt-2">
                Pick or Pass reviews Facebook Marketplace listing text and photos
                to help you decide whether a used-toy pickup is worth the trip.
              </p>
            </div>

            <div>
              <h3 className="text-eyebrow">Limitations</h3>
              <p className="mt-2">
                Results are informational only — not a guarantee of condition,
                safety, or value. This tool does not verify prices, recalls,
                seller identity, or listing accuracy. Not affiliated with Meta or
                Facebook.
              </p>
            </div>

            <div>
              <h3 className="text-eyebrow">Your responsibility</h3>
              <p className="mt-2">
                Always inspect items in person before you buy. Use your own
                judgment for child safety and final purchasing decisions.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

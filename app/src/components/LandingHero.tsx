"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  BadgeCheck,
  Camera,
  ChevronDown,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

const STEPS: {
  step: string;
  icon: LucideIcon;
  title: string;
  body: string;
}[] = [
  {
    step: "1",
    icon: ClipboardList,
    title: "Paste the listing",
    body: "Copy the seller's description.",
  },
  {
    step: "2",
    icon: Camera,
    title: "Add a photo",
    body: "Upload a screenshot or photo.",
  },
  {
    step: "3",
    icon: BadgeCheck,
    title: "Get a verdict",
    body: "Good, Not sure, or Avoid.",
  },
];

export function LandingHero() {
  const [howOpen, setHowOpen] = useState(false);

  return (
    <section aria-labelledby="hero-heading" className="mb-4">
      <h1 id="hero-heading" className="text-hero-headline text-foreground">
        Worth the drive?
      </h1>
      <p className="mt-2 max-w-prose text-base leading-snug text-muted">
        For parents buying used toys on Facebook Marketplace. Paste the listing,
        add a photo, and get a read before you leave home.
      </p>

      <Collapsible.Root
        open={howOpen}
        onOpenChange={setHowOpen}
        className="mt-3"
      >
        <Collapsible.Trigger className="inline-flex min-h-11 items-center gap-2 text-base font-medium text-accent hover:text-accent-hover">
          How it works
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              howOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </Collapsible.Trigger>
        <Collapsible.Content className="mt-3">
          <HowItWorksSteps />
        </Collapsible.Content>
      </Collapsible.Root>
    </section>
  );
}

function HowItWorksSteps() {
  return (
    <ol className="grid gap-2.5 sm:grid-cols-3">
      {STEPS.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.step}>
            <Card className="h-full">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-start gap-2.5">
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-subtle">
                      Step {item.step}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold leading-tight text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-muted">
                      {item.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

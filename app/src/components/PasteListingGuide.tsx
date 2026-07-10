"use client";

import { cn } from "@/lib/utils";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = [
  {
    id: "select",
    label: "1. Select the listing text",
    detail: "Press and hold, then drag to highlight title, price, condition, and seller info.",
  },
  {
    id: "copy",
    label: "2. Copy",
    detail: "Tap Copy. Star ratings are images — they will not come along.",
  },
  {
    id: "paste",
    label: "3. Paste here",
    detail: "Paste into the description box below, then type the seller rating separately.",
  },
] as const;

const CYCLE_MS = 9000;
const STEP_MS = CYCLE_MS / STEPS.length;

export function PasteListingGuide() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open || reduceMotion) return;
    const id = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [open, reduceMotion]);

  useEffect(() => {
    if (!open) setStepIndex(0);
  }, [open]);

  const step = STEPS[stepIndex];

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="mt-2">
      <Collapsible.Trigger
        type="button"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover"
      >
        See how to copy from Marketplace
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </Collapsible.Trigger>

      <Collapsible.Content className="mt-3">
        <div className="overflow-hidden rounded-xl border border-border bg-facebook-soft/40 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <PasteDemoAnimation
              active={open}
              stepIndex={stepIndex}
              reduceMotion={reduceMotion}
            />

            <div className="min-w-0 flex-1">
              <p className="text-eyebrow text-facebook">Quick tip</p>
              <p
                className="mt-1 text-base font-semibold text-foreground"
                aria-live="polite"
              >
                {step.label}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {step.detail}
              </p>

              <ol className="mt-3 space-y-1.5" aria-hidden="true">
                {STEPS.map((s, i) => (
                  <li
                    key={s.id}
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      i === stepIndex
                        ? "font-medium text-foreground"
                        : "text-muted-subtle",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        i === stepIndex
                          ? "bg-facebook text-white"
                          : "bg-border text-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    {s.label.replace(/^\d+\.\s*/, "")}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function PasteDemoAnimation({
  active,
  stepIndex,
  reduceMotion,
}: {
  active: boolean;
  stepIndex: number;
  reduceMotion: boolean;
}) {
  const phase = reduceMotion ? 2 : stepIndex;
  const selecting = phase === 0;
  const copying = phase === 1;
  const pasting = phase === 2;

  return (
    <div
      className="mx-auto w-[148px] shrink-0 sm:mx-0"
      aria-hidden="true"
      data-active={active ? "true" : "false"}
    >
      {/* Phone frame */}
      <div className="relative overflow-hidden rounded-[1.25rem] border-2 border-border-strong bg-surface shadow-sm">
        <div className="flex items-center justify-center border-b border-border bg-background px-2 py-1.5">
          <span className="h-1 w-8 rounded-full bg-border-strong" />
        </div>

        <div className="relative h-[220px] overflow-hidden bg-background px-2.5 py-2">
          {/* Marketplace listing screen */}
          <div
            className={cn(
              "absolute inset-x-2.5 top-2 transition-all duration-500",
              pasting
                ? "-translate-x-[110%] opacity-0"
                : "translate-x-0 opacity-100",
            )}
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-facebook">
              Marketplace
            </p>
            <div className="mt-1.5 overflow-hidden rounded-md border border-border bg-surface">
              <div className="h-12 bg-gradient-to-br from-stone-200 to-stone-300" />
              <div className="space-y-1 p-1.5">
                <p
                  className={cn(
                    "rounded px-0.5 text-[10px] font-semibold leading-tight text-foreground",
                    selecting && "paste-guide-highlight",
                  )}
                >
                  Toddler peg toy
                </p>
                <p
                  className={cn(
                    "rounded px-0.5 text-[10px] font-bold text-foreground",
                    selecting && "paste-guide-highlight",
                  )}
                >
                  $3
                </p>
                <p
                  className={cn(
                    "rounded px-0.5 text-[8px] leading-snug text-muted",
                    selecting && "paste-guide-highlight",
                  )}
                >
                  Used · Good · San Jose
                </p>
                <p
                  className={cn(
                    "rounded px-0.5 text-[8px] text-muted",
                    selecting && "paste-guide-highlight",
                  )}
                >
                  Seller · Highly rated
                </p>
                <p className="px-0.5 text-[7px] text-muted-subtle">
                  ★★★★☆{" "}
                  <span className="italic">(image — won&apos;t copy)</span>
                </p>
              </div>
            </div>

            {/* Copy action bubble */}
            <div
              className={cn(
                "mt-2 flex justify-center transition-all duration-300",
                copying
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0",
              )}
            >
              <span className="rounded-md bg-foreground px-2.5 py-1 text-[9px] font-semibold text-surface shadow">
                Copy
              </span>
            </div>
          </div>

          {/* Paste destination (Pick or Pass) */}
          <div
            className={cn(
              "absolute inset-x-2.5 top-2 transition-all duration-500",
              pasting
                ? "translate-x-0 opacity-100"
                : "translate-x-[110%] opacity-0",
            )}
          >
            <p className="text-[9px] font-semibold text-brand">Pick or Pass</p>
            <div
              className={cn(
                "mt-1.5 min-h-[120px] rounded-md border-2 border-dashed bg-surface p-1.5",
                pasting ? "border-accent" : "border-border",
              )}
            >
              <p className="text-[7px] font-medium text-muted-subtle">
                Full listing description
              </p>
              <p
                className={cn(
                  "mt-1 whitespace-pre-wrap text-[8px] leading-snug text-foreground transition-opacity duration-500",
                  pasting ? "opacity-100" : "opacity-0",
                )}
              >
                Toddler peg toy{"\n"}$3{"\n"}Used · Good · San Jose{"\n"}Seller
                · Highly rated
              </p>
            </div>
            <p className="mt-1.5 text-[7px] leading-snug text-muted">
              Then add seller rating → 4.5
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

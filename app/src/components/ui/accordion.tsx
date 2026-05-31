"use client";

import { cn } from "@/lib/utils";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export function AccordionRoot({
  children,
  defaultValue,
  className,
}: {
  children: ReactNode;
  defaultValue?: string[];
  className?: string;
}) {
  return (
    <Accordion.Root
      type="multiple"
      defaultValue={defaultValue}
      className={cn("divide-y divide-border", className)}
    >
      {children}
    </Accordion.Root>
  );
}

export function AccordionItem({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Accordion.Item value={value} className="group">
      <Accordion.Header>
        <Accordion.Trigger
          className={cn(
            "flex min-h-10 w-full items-center justify-between gap-4 py-3 text-left",
            "text-subsection-title font-semibold text-foreground",
            "hover:text-accent focus-visible:rounded-md",
            "[&[data-state=open]>svg]:rotate-180",
          )}
        >
          {title}
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted transition-transform duration-200"
            aria-hidden="true"
          />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden text-sm font-normal leading-relaxed text-muted">
        <div className="pb-4 pr-2">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

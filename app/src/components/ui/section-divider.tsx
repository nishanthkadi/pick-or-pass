import { cn } from "@/lib/utils";

type SectionDividerProps = {
  title: string;
  id?: string;
  align?: "left" | "center";
  compact?: boolean;
  prominent?: boolean;
};

export function SectionDivider({
  title,
  id,
  align = "left",
  compact = false,
  prominent = false,
}: SectionDividerProps) {
  return (
    <div
      className={align === "center" ? "text-center" : ""}
      role="presentation"
    >
      <div
        className={cn(
          "border-t",
          prominent ? "border-accent/30" : "border-border",
          compact ? "pt-4" : "pt-8",
        )}
      >
        <h2
          id={id}
          className={cn(
            prominent
              ? "text-section-divider-prominent"
              : "text-section-divider text-foreground",
          )}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}

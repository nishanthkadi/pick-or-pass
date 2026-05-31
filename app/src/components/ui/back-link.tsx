import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

type BackLinkProps = {
  onClick: () => void;
  label?: string;
  className?: string;
};

export function BackLink({
  onClick,
  label = "Back to home",
  className,
}: BackLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 text-base font-medium text-muted",
        "hover:text-foreground focus-visible:rounded-md",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

type AlertProps = {
  children: ReactNode;
  variant?: "error" | "warning" | "info";
  role?: "alert" | "status";
  className?: string;
};

const styles = {
  error: "border-destructive-border bg-destructive-bg text-destructive-text",
  warning: "border-warning-border bg-warning-bg text-warning-text",
  info: "border-border bg-accent-soft text-foreground",
};

export function Alert({
  children,
  variant = "error",
  role = "alert",
  className,
}: AlertProps) {
  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-base",
        styles[variant],
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

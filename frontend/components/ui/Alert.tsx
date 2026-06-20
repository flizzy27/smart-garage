import type { ReactNode } from "react";

export function Alert({
  variant = "error",
  children,
}: {
  variant?: "error" | "info" | "success";
  children: ReactNode;
}) {
  const styles =
    variant === "error"
      ? "border-danger/30 bg-danger-muted text-danger"
      : variant === "success"
        ? "border-success/30 bg-success-muted text-success"
        : "border-border bg-muted text-muted-foreground";

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${styles}`}
      role="alert"
    >
      {children}
    </div>
  );
}

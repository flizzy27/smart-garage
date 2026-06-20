import type { SelectHTMLAttributes, ReactNode } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  children: ReactNode;
};

export function Select({
  className = "",
  error = false,
  children,
  ...props
}: SelectProps) {
  return (
    <select
      className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${
        error
          ? "border-danger focus:border-danger"
          : "border-border focus:border-accent"
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

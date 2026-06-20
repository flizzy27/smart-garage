import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export function Input({ className = "", error = false, ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 ${
        error
          ? "border-danger focus:border-danger"
          : "border-border focus:border-accent"
      } ${className}`}
      {...props}
    />
  );
}

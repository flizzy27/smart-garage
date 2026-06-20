import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export function Textarea({
  className = "",
  error = false,
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={`min-h-28 w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 ${
        error
          ? "border-danger focus:border-danger"
          : "border-border focus:border-accent"
      } ${className}`}
      {...props}
    />
  );
}

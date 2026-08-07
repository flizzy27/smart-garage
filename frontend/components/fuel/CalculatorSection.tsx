"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  hint?: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  /**
   * Headline result, kept visible while the section is collapsed — the whole
   * point of collapsing is to hide the inputs, not the answer.
   */
  summary?: string;
  children: ReactNode;
};

export function CalculatorSection({
  title,
  hint,
  icon,
  open,
  onToggle,
  summary,
  children,
}: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 sm:px-5"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
            open ? "bg-accent text-accent-foreground" : "bg-accent/10 text-accent"
          }`}
          aria-hidden
        >
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {title}
          </span>
          {/* While open the hint moves into the body, so the header never
              repeats it. */}
          {open ? null : summary ? (
            <span className="mt-0.5 block truncate text-xs font-medium tabular-nums text-accent">
              {summary}
            </span>
          ) : hint ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </span>

        <svg
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div className="border-t border-border-subtle px-4 py-4 sm:px-5">
          {hint ? (
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              {hint}
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

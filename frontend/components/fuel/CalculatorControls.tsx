"use client";

import type { ReactNode } from "react";

/**
 * Input controls tuned for the fuel calculator: every target is at least 44 px
 * tall, numeric fields open the decimal keypad on a phone, and the unit sits
 * inside the field so the label stays short enough for a narrow screen.
 */

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  hint?: string;
  placeholder?: string;
  /** Upper bound, applied while typing (days per week, fill level, …). */
  max?: number;
  className?: string;
};

/**
 * Keeps a field numeric without `type="number"`, which silently discards
 * "7,5" — and a comma is exactly what a German phone keypad puts there.
 */
function sanitizeNumeric(raw: string): string {
  const cleaned = raw.replace(/[^0-9.,]/g, "");
  const separatorAt = cleaned.search(/[.,]/);
  if (separatorAt === -1) return cleaned;
  return (
    cleaned.slice(0, separatorAt) +
    cleaned[separatorAt] +
    cleaned.slice(separatorAt + 1).replace(/[.,]/g, "")
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  hint,
  placeholder,
  max,
  className = "",
}: NumberFieldProps) {
  const handleChange = (raw: string) => {
    const next = sanitizeNumeric(raw);
    if (max != null) {
      const parsed = Number(next.replace(",", "."));
      if (Number.isFinite(parsed) && parsed > max) {
        onChange(String(max));
        return;
      }
    }
    onChange(next);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          // `decimal` gives the numeric keypad on a phone while still allowing
          // a comma as the decimal separator.
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          className={`h-12 w-full rounded-xl border border-border bg-card text-base font-semibold tabular-nums text-foreground shadow-sm transition-colors placeholder:font-normal placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${
            unit ? "pl-3.5 pr-14" : "px-3.5"
          }`}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-medium text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ToggleField({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
        checked
          ? "border-accent/40 bg-accent/10"
          : "border-border bg-card hover:bg-muted/60"
      }`}
    >
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-muted-foreground/30"
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[1.125rem]" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint ? (
          <span className="block text-[11px] text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}

export function StepperField({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={decreaseLabel}
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-xl font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          −
        </button>
        <div className="flex h-12 flex-1 items-center justify-center rounded-xl border border-border bg-muted/40 text-lg font-semibold tabular-nums text-foreground">
          {value}
        </div>
        <button
          type="button"
          aria-label={increaseLabel}
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-xl font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function SliderField({
  id,
  label,
  value,
  onChange,
  valueLabel,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  valueLabel: string;
}) {
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {valueLabel}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full cursor-pointer accent-[var(--accent)]"
      />
    </div>
  );
}

export function ResultGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">{children}</div>
  );
}

export function ResultTile({
  label,
  value,
  detail,
  tone = "neutral",
  wide = false,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "accent" | "positive" | "negative";
  wide?: boolean;
}) {
  const toneClass = {
    neutral: "border-border bg-muted/40 text-foreground",
    accent: "border-accent/30 bg-accent/10 text-foreground",
    positive: "border-success/30 bg-success/10 text-foreground",
    negative: "border-warning/30 bg-warning/10 text-foreground",
  }[tone];

  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${toneClass} ${wide ? "sm:col-span-2" : ""}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {detail ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

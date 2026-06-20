import type { ComponentType, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  bordered = true,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`px-5 py-4 ${bordered ? "border-b border-border-subtle" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

type StatCardProps = {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ComponentType<{ className?: string }>;
  trend?: { label: string; tone?: "neutral" | "positive" | "negative" };
  className?: string;
};

const trendToneClass = {
  neutral: "text-muted-foreground",
  positive: "text-success",
  negative: "text-warning",
};

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  trend,
  className = "",
}: StatCardProps) {
  return (
    <Card className={`h-full ${className}`}>
      <CardContent className="flex h-full flex-col gap-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {Icon ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
        </div>
        <div className="mt-auto">
          <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {detail ? (
            <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
          ) : null}
          {trend ? (
            <p
              className={`mt-2 text-xs font-medium ${trendToneClass[trend.tone ?? "neutral"]}`}
            >
              {trend.label}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

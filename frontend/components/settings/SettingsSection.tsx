import type { ReactNode } from "react";

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </section>
  );
}

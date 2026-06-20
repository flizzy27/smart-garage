"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { readSettings, writeSettings } from "@/lib/settings/storage";

const options: { value: Locale; label: string }[] = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
];

export function AuthLocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    writeSettings({ ...readSettings(), locale: next });
    router.replace(pathname, { locale: next });
  };

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm"
      role="group"
      aria-label="Language"
    >
      {options.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => switchLocale(option.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

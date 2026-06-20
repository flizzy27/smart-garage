"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";

const sections = [
  { href: "/settings", key: "general" as const, exact: true },
  { href: "/settings/notifications", key: "notifications" as const },
  { href: "/settings/regional", key: "regional" as const },
  { href: "/settings/catalog", key: "catalog" as const },
];

export function SettingsNav() {
  const t = useTranslations("pages.settings.nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("ariaLabel")}
      className="w-full shrink-0 lg:w-52"
    >
      <ul className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 lg:flex-col lg:overflow-visible">
        {sections.map((section) => {
          const isActive = section.exact
            ? pathname === section.href
            : pathname === section.href || pathname.startsWith(`${section.href}/`);

          return (
            <li key={section.href} className="min-w-[8.5rem] lg:min-w-0">
              <Link
                href={section.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t(section.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

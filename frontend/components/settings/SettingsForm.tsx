"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { useUserSettings } from "@/providers/UserSettingsProvider";
import type { CurrencyCode, ThemeMode } from "@/lib/settings/types";
import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/settings/types";

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:max-w-xs"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AppearanceSettings() {
  const t = useTranslations("pages.settings.theme");
  const { settings, setTheme } = useUserSettings();

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
    { value: "system", label: t("system") },
  ];

  return (
    <SelectField
      id="theme"
      label={t("label")}
      value={settings.theme}
      onChange={(v) => setTheme(v as ThemeMode)}
      options={themeOptions}
    />
  );
}

export function LanguageSettings() {
  const t = useTranslations("pages.settings.language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { setLocale } = useUserSettings();

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "de", label: "Deutsch" },
  ];

  return (
    <SelectField
      id="language"
      label={t("label")}
      value={locale}
      onChange={(nextLocale) => {
        setLocale(nextLocale as Locale);
        router.replace(pathname, { locale: nextLocale as Locale });
      }}
      options={languageOptions}
    />
  );
}

export function RegionalSettings() {
  const t = useTranslations("pages.settings.regional");
  const { settings, setTimezone, setCurrency } = useUserSettings();

  return (
    <div className="space-y-4">
      <SelectField
        id="timezone"
        label={t("timezone")}
        value={settings.timezone}
        onChange={setTimezone}
        options={TIMEZONE_OPTIONS.map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") }))}
      />
      <SelectField
        id="currency"
        label={t("currency")}
        value={settings.currency}
        onChange={(value) => setCurrency(value as CurrencyCode)}
        options={CURRENCY_OPTIONS.map((code) => ({ value: code, label: code }))}
      />
    </div>
  );
}

export function FutureSettingsPlaceholder() {
  const t = useTranslations("pages.settings.future");
  const tCommon = useTranslations("common");

  const rows = [t("accentColor")];

  return (
    <ul className="space-y-3">
      {rows.map((label) => (
        <li
          key={label}
          className="flex items-center justify-between rounded-lg border border-dashed border-border px-4 py-3 text-sm"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="text-xs font-medium text-muted-foreground">
            {tCommon("comingSoon")}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CatalogDataAttribution() {
  const t = useTranslations("pages.settings.catalog");

  return (
    <p className="text-sm text-muted-foreground">
      {t("notice")}{" "}
      <a
        href="https://cardata.wiki/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-accent underline-offset-2 hover:underline"
      >
        cardata.wiki
      </a>{" "}
      ({t("license")}).
    </p>
  );
}

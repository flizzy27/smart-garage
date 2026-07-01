"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { useUserSettings } from "@/providers/UserSettingsProvider";
import type { CurrencyCode, ThemeMode } from "@/lib/settings/types";
import {
  CURRENCY_OPTIONS,
  MAINTENANCE_DUE_SOON_DAYS_OPTIONS,
  MAINTENANCE_DUE_SOON_KM_OPTIONS,
  TIMEZONE_OPTIONS,
  clampMaintenanceDueSoonDays,
  clampMaintenanceDueSoonKm,
} from "@/lib/settings/types";

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

export function QuickFuelSettings() {
  const t = useTranslations("pages.settings.quickFuel");
  const { settings, setQuickFuelEnabled } = useUserSettings();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="sm:max-w-sm">
        <p className="text-sm font-medium text-foreground">{t("label")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("hint")}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={settings.quickFuelEnabled}
        onClick={() => setQuickFuelEnabled(!settings.quickFuelEnabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          settings.quickFuelEnabled ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            settings.quickFuelEnabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
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

function ThresholdField({
  id,
  label,
  hint,
  value,
  unit,
  options,
  min,
  max,
  step,
  clamp,
  onCommit,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  unit: string;
  options: readonly number[];
  min: number;
  max: number;
  step: number;
  clamp: (value: number) => number;
  onCommit: (value: number) => void;
}) {
  // Draft is seeded from the committed value. The parent remounts this field
  // (via key) whenever the value changes externally, so no effect sync is needed.
  const [draft, setDraft] = useState(String(value));

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = clamp(Number.isNaN(parsed) ? value : parsed);
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="sm:max-w-sm">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            list={`${id}-presets`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit((e.target as HTMLInputElement).value);
              }
            }}
            className="w-28 rounded-lg border border-border bg-card py-2 pl-3 pr-12 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        </div>
        <datalist id={`${id}-presets`}>
          {options.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

export function MaintenanceReminderSettings() {
  const t = useTranslations("pages.settings.maintenance");
  const { settings, setMaintenanceDueSoonKm, setMaintenanceDueSoonDays } =
    useUserSettings();

  return (
    <div className="space-y-5">
      <ThresholdField
        key={`km-${settings.maintenanceDueSoonKm}`}
        id="maintenanceDueSoonKm"
        label={t("dueSoonKm")}
        hint={t("dueSoonKmHint")}
        value={settings.maintenanceDueSoonKm}
        unit={t("unitKm")}
        options={MAINTENANCE_DUE_SOON_KM_OPTIONS}
        min={0}
        max={50000}
        step={50}
        clamp={clampMaintenanceDueSoonKm}
        onCommit={setMaintenanceDueSoonKm}
      />
      <ThresholdField
        key={`days-${settings.maintenanceDueSoonDays}`}
        id="maintenanceDueSoonDays"
        label={t("dueSoonDays")}
        hint={t("dueSoonDaysHint")}
        value={settings.maintenanceDueSoonDays}
        unit={t("unitDays")}
        options={MAINTENANCE_DUE_SOON_DAYS_OPTIONS}
        min={0}
        max={365}
        step={1}
        clamp={clampMaintenanceDueSoonDays}
        onCommit={setMaintenanceDueSoonDays}
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

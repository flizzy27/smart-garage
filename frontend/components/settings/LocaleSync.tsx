"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/lib/i18n/routing";
import { readSettings, writeSettings } from "@/lib/settings/storage";

/** Keeps localStorage user settings in sync with the active URL locale. */
export function LocaleSync() {
  const locale = useLocale() as Locale;

  useEffect(() => {
    const stored = readSettings();
    if (stored.locale !== locale) {
      writeSettings({ ...stored, locale });
    }
  }, [locale]);

  return null;
}

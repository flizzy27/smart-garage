"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { recoverFromInvalidSession } from "@/lib/actions/auth";

/**
 * Segment-level error boundary for everything under `/[locale]`.
 *
 * This is the safety net for the "cookie/session crash" bug: if a page ever
 * throws because a session cookie is stale, orphaned (DB reset/restore), or
 * belongs to a deactivated user, `getCurrentUserId()`/`requireAdmin()` throw
 * `UNAUTHORIZED`/`FORBIDDEN` instead of returning a user. Without this
 * boundary, Next.js shows its generic "This page couldn't load" error.
 *
 * Instead we: clear the stale cookie via a Server Action (only Server
 * Actions/Route Handlers may mutate cookies), then redirect to login with a
 * friendly message — the user never needs to know cookies were involved.
 *
 * Any other unexpected error gets a friendly "try again" card instead of the
 * raw framework error page.
 */
const AUTH_ERROR_MESSAGES = new Set(["UNAUTHORIZED", "FORBIDDEN"]);

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorBoundary");
  const router = useRouter();
  const params = useParams<{ locale?: string | string[] }>();
  const localeParam = params?.locale;
  const locale = typeof localeParam === "string" ? localeParam : "en";
  const isAuthError = AUTH_ERROR_MESSAGES.has(error.message);
  const [recoveryFailed, setRecoveryFailed] = useState(false);

  useEffect(() => {
    if (!isAuthError) {
      // The original error + stack is already printed server-side by Next.js
      // when it was thrown; this just makes the client-side digest visible too.
      console.error("[error-boundary]", error.digest ?? error.message);
      return;
    }

    let cancelled = false;
    recoverFromInvalidSession()
      .catch(() => {
        // Even if cookie cleanup fails, still send the user to login —
        // logging in again overwrites any stale cookie regardless.
      })
      .finally(() => {
        if (cancelled) return;
        router.replace(`/${locale}/login?sessionExpired=1`);
      });

    // Fallback in case navigation doesn't happen quickly (e.g. slow action).
    const timeout = setTimeout(() => {
      if (!cancelled) setRecoveryFailed(true);
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthError, locale]);

  if (isAuthError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">{t("sessionExpiredDescription")}</p>
          {recoveryFailed ? (
            <Button onClick={() => router.replace(`/${locale}/login?sessionExpired=1`)}>
              {t("goHome")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()}>{t("reload")}</Button>
          <Button variant="secondary" onClick={() => router.push(`/${locale}`)}>
            {t("goHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { loginAction, type AuthActionResult } from "@/lib/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { AppLogo } from "@/components/brand/AppLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function LoginForm({
  sessionExpired = false,
  oidc = null,
  errorCode = null,
}: {
  sessionExpired?: boolean;
  /** Present only when OIDC is configured via environment variables. */
  oidc?: { label: string; startUrl: string } | null;
  /** Error handed back by the OIDC callback redirect. */
  errorCode?: string | null;
}) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(loginAction, null);

  const shownError = state?.error ?? errorCode;

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <AppLogo showName={false} size="lg" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">{t("loginTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
        </div>
      </div>

      {!shownError && sessionExpired ? (
        <Alert variant="info">{t("sessionExpiredNotice")}</Alert>
      ) : null}

      {shownError ? (
        <Alert variant="error">
          {t.has(`errors.${shownError}` as never)
            ? t(`errors.${shownError}` as never)
            : t("errors.failed")}
        </Alert>
      ) : null}

      {oidc ? (
        <div className="space-y-4">
          <a
            href={oidc.startUrl}
            className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90"
          >
            {t("signInWith", { provider: oidc.label })}
          </a>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("or")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username" required>
            {t("username")}
          </Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            minLength={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" required>
            {t("password")}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
          />
        </div>
        <label className="group flex cursor-pointer items-center gap-3 text-sm text-foreground">
          <input type="checkbox" name="rememberMe" className="sr-only" />
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card transition-colors group-has-[:checked]:border-success group-has-[:checked]:bg-success">
            <svg
              className="h-3 w-3 text-white opacity-0 transition-opacity group-has-[:checked]:opacity-100"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>{t("rememberMe")}</span>
        </label>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("signingIn") : t("signIn")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          {t("registerLink")}
        </Link>
      </p>
    </div>
  );
}

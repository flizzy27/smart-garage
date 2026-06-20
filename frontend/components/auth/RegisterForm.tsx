"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { registerAction, type AuthActionResult } from "@/lib/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { AppLogo } from "@/components/brand/AppLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(registerAction, null);

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <AppLogo showName={false} size="lg" />
        <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">
          {t("registerTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("registerSubtitle")}</p>
        </div>
      </div>

      {state?.error ? (
        <Alert variant="error">{t(`errors.${state.error}`)}</Alert>
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
            maxLength={32}
            pattern="[a-zA-Z0-9_-]+"
          />
          <p className="text-xs text-muted-foreground">{t("usernameHint")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" required>
            {t("password")}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("creatingAccount") : t("createAccount")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}

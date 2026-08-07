"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  saveFuelPriceApiKeyAction,
  type FuelPriceKeyResult,
} from "@/lib/actions/fuel-price-config";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { TANKERKOENIG_SIGNUP_URL } from "@/lib/fuel-prices/types";

type Props = {
  /** Masked form of the currently active key, or null when there is none. */
  maskedKey: string | null;
  source: "app" | "env" | null;
  /** True when TANKERKOENIG_API_KEY is set in the container. */
  hasEnvKey: boolean;
  canEdit: boolean;
};

export function FuelPriceSettings({
  maskedKey,
  source,
  hasEnvKey,
  canEdit,
}: Props) {
  const t = useTranslations("pages.settings.fuelPrices");
  const [value, setValue] = useState("");
  const [state, formAction, pending] = useActionState<
    FuelPriceKeyResult | null,
    FormData
  >(saveFuelPriceApiKeyAction, null);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("status.label")}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {maskedKey
            ? t(source === "env" ? "status.fromEnv" : "status.fromApp", {
                key: maskedKey,
              })
            : t("status.missing")}
        </p>
        {hasEnvKey && source === "app" ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("status.appOverridesEnv")}
          </p>
        ) : null}
      </div>

      {/* The wait is the single most confusing part of this setup, so it is
          stated before the field rather than hidden in a doc. */}
      <div className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t("howTo.title")}
        </h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>{t("howTo.step1")}</li>
          <li>{t("howTo.step2")}</li>
          <li>{t("howTo.step3")}</li>
        </ol>
        <p className="mt-2.5 rounded-lg bg-warning-muted px-3 py-2 text-xs leading-relaxed text-foreground">
          {t("howTo.reviewNotice")}
        </p>
        <a
          href={TANKERKOENIG_SIGNUP_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          {t("howTo.cta")}
        </a>
      </div>

      {canEdit ? (
        <form action={formAction} className="space-y-3">
          {state?.error ? (
            <Alert variant="error">{t(`errors.${state.error}`)}</Alert>
          ) : null}
          {state?.ok ? <Alert variant="success">{t("saved")}</Alert> : null}

          <div className="space-y-1.5">
            <Label htmlFor="tankerkoenig-key">{t("field.label")}</Label>
            <Input
              id="tankerkoenig-key"
              name="apiKey"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("field.placeholder")}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("field.hint")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("save")}
            </Button>
            {/* A submit button named `apiKey` would add a second entry with
                that name, and `FormData.get` returns the first one — the text
                field — so removal gets its own flag. */}
            {maskedKey && source === "app" ? (
              <Button
                type="submit"
                variant="danger"
                name="remove"
                value="1"
                disabled={pending}
              >
                {t("remove")}
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <Alert variant="info">{t("adminOnly")}</Alert>
      )}
    </div>
  );
}

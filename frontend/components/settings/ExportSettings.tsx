"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { importBackupAction, type ImportBackupActionResult } from "@/lib/actions/backup";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function ExportSettings() {
  const t = useTranslations("pages.settings.export");
  const [state, action, pending] = useActionState<
    ImportBackupActionResult | null,
    FormData
  >(importBackupAction, null);

  const linkClass =
    "inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <a href="/api/export?format=json" download className={linkClass}>
          {t("downloadJson")}
        </a>
        <a href="/api/export?format=csv" download className={linkClass}>
          {t("downloadCsv")}
        </a>
      </div>

      <form action={action} className="space-y-4 border-t border-border-subtle pt-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("importTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("importDescription")}</p>
        </div>

        {state?.error ? (
          <Alert variant="error">{t(`errors.${state.error}`)}</Alert>
        ) : null}
        {state?.ok ? (
          <Alert variant="success">
            {t("imported", {
              vehicles: state.summary?.vehicles ?? 0,
              records: state.summary?.maintenanceRecords ?? 0,
              documents: state.summary?.documents ?? 0,
            })}
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="backupFile">{t("backupFile")}</Label>
            <Input
              id="backupFile"
              name="backupFile"
              type="file"
              accept="application/json,.json"
              required
            />
            <p className="text-xs text-danger">{t("importWarning")}</p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? t("importing") : t("importBackup")}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  removeBackgroundFormAction,
  uploadBackgroundAction,
  type BackgroundActionResult,
} from "@/lib/actions/appearance";

type BackgroundSettingsProps = {
  hasBackground: boolean;
};

export function BackgroundSettings({ hasBackground }: BackgroundSettingsProps) {
  const t = useTranslations("pages.settings.background");
  const router = useRouter();
  const [uploadState, uploadAction, uploading] = useActionState<
    BackgroundActionResult | null,
    FormData
  >(uploadBackgroundAction, null);
  const [removeState, removeAction, removing] = useActionState<
    BackgroundActionResult | null,
    FormData
  >(removeBackgroundFormAction, null);

  const errorKey = uploadState?.error ?? removeState?.error;

  useEffect(() => {
    if (uploadState?.ok || removeState?.ok) {
      router.refresh();
    }
  }, [uploadState?.ok, removeState?.ok, router]);

  return (
    <div className="space-y-4">
      {hasBackground ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div
            className="h-36 bg-cover bg-center"
            style={{ backgroundImage: "url(/api/users/background)" }}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {errorKey ? (
        <Alert variant="error">{t(`errors.${errorKey}` as "errors.uploadFailed")}</Alert>
      ) : null}
      {uploadState?.ok ? <Alert variant="success">{t("uploaded")}</Alert> : null}
      {removeState?.ok ? <Alert variant="success">{t("removed")}</Alert> : null}

      <form
        action={uploadAction}
        className="space-y-3"
      >
        <div className="space-y-2">
          <Label htmlFor="background-file">{t("file")}</Label>
          <Input
            id="background-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
          />
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
        <Button type="submit" variant="secondary" disabled={uploading}>
          {uploading ? t("uploading") : t("upload")}
        </Button>
      </form>

      {hasBackground ? (
        <form action={removeAction}>
          <Button type="submit" variant="ghost" disabled={removing}>
            {removing ? t("removing") : t("remove")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

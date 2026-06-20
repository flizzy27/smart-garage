"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { removeShareFormAction, shareVehicleAction } from "@/lib/actions/sharing";
import type { SerializedShare } from "./VehicleDetailPanels";

type Props = {
  vehicleId: string;
  shares: SerializedShare[];
};

export function VehicleSharingPanel({ vehicleId, shares }: Props) {
  const t = useTranslations("vehicles.sharing");
  const router = useRouter();
  const boundAction = shareVehicleAction.bind(null, vehicleId);
  const [state, action, pending] = useActionState(boundAction, null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {shares.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-2">
            {shares.map((share) => (
              <li
                key={share.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {share.displayName ?? share.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{share.username} · {t(`roles.${share.role}`)}
                  </p>
                </div>
                <form action={removeShareFormAction}>
                  <input type="hidden" name="shareId" value={share.id} />
                  <input type="hidden" name="vehicleId" value={vehicleId} />
                  <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                    {t("remove")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {state?.error ? (
          <Alert variant="error">{t(`errors.${state.error}` as "errors.unknown")}</Alert>
        ) : null}

        <form action={action} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="space-y-1">
            <Label htmlFor="share-username">{t("username")}</Label>
            <Input id="share-username" name="username" required placeholder={t("usernamePlaceholder")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="share-role">{t("role")}</Label>
            <Select id="share-role" name="role" defaultValue="VIEWER">
              <option value="VIEWER">{t("roles.VIEWER")}</option>
              <option value="EDITOR">{t("roles.EDITOR")}</option>
            </Select>
          </div>
          <Button type="submit" className="px-3 py-1.5 text-xs" disabled={pending}>
            {pending ? t("sharing") : t("share")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

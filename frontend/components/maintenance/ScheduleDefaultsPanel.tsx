"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MaintenanceItemCategory } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  MaintenanceItemsEditor,
  itemsFromSerialized,
  type EditableMaintenanceItem,
} from "@/components/maintenance/MaintenanceItemsEditor";
import {
  clearScheduleDefaultsAction,
  saveScheduleDefaultsAction,
  type MaintenanceActionResult,
} from "@/lib/actions/maintenance";
import type { SerializedMaintenanceItem } from "@/lib/repositories/maintenance-items";

type ScheduleDefaultsPanelProps = {
  scheduleId: string;
  defaults: SerializedMaintenanceItem[];
  suggestedCategories: MaintenanceItemCategory[];
};

export function ScheduleDefaultsPanel({
  scheduleId,
  defaults,
  suggestedCategories,
}: ScheduleDefaultsPanelProps) {
  const t = useTranslations("maintenance.defaults");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EditableMaintenanceItem[]>(() =>
    itemsFromSerialized(defaults),
  );
  const [clearing, setClearing] = useState(false);

  const [state, formAction, pending] = useActionState<
    MaintenanceActionResult | null,
    FormData
  >(async (prev, formData) => {
    const result = await saveScheduleDefaultsAction(prev, formData);
    if (result.ok) router.refresh();
    return result;
  }, null);

  async function handleClear() {
    setClearing(true);
    const result = await clearScheduleDefaultsAction(scheduleId);
    setClearing(false);
    if (result.ok) {
      setItems([]);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
        <div className="flex items-center gap-2">
          {defaults.length > 0 ? (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
              {t("count", { count: defaults.length })}
            </span>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 px-3 py-1.5 text-xs"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? t("hide") : t("manage")}
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-4 pt-0">
          {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
          {state?.ok ? <Alert variant="success">{t("saved")}</Alert> : null}

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="scheduleId" value={scheduleId} />
            <MaintenanceItemsEditor
              items={items}
              onChange={setItems}
              suggestedCategories={suggestedCategories}
              idPrefix="default-item"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending} className="px-3 py-1.5 text-xs">
                {pending ? t("saving") : t("save")}
              </Button>
              {defaults.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                  onClick={handleClear}
                  disabled={clearing}
                >
                  {clearing ? t("clearing") : t("clear")}
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}

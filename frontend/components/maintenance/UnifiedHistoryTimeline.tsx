"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatDate } from "@/lib/regional/format";
import { formatDistance } from "@/lib/regional/distance";
import { formatVolume, volumeUnitLabel } from "@/lib/regional/volume";
import { renderMarkdownToSafeHtml } from "@/lib/notes/markdown";
import { EditMaintenanceRecordDialog } from "@/components/maintenance/EditMaintenanceRecordDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Alert } from "@/components/ui/Alert";
import { deleteMaintenanceRecordAction } from "@/lib/actions/maintenance";
import { useUserSettings } from "@/providers/UserSettingsProvider";
import type { HistoryEvent } from "@/lib/services/maintenance";
import type { SerializedMaintenanceRecord } from "@/lib/repositories/maintenance-records";

type Props = {
  events: HistoryEvent[];
};

function eventTone(kind: HistoryEvent["kind"], isFirst: boolean) {
  if (isFirst) return "border-accent/30 bg-accent/5";
  if (kind === "fuel") return "border-emerald-500/20 bg-emerald-500/5";
  if (kind === "odometer") return "border-sky-500/20 bg-sky-500/5";
  return "border-border bg-card";
}

export function UnifiedHistoryTimeline({ events }: Props) {
  const t = useTranslations("history");
  const tMaintenance = useTranslations("maintenance");
  const locale = useLocale();
  const { settings } = useUserSettings();
  const router = useRouter();
  const [editingRecord, setEditingRecord] = useState<SerializedMaintenanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<SerializedMaintenanceRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  const confirmDelete = () => {
    if (!deletingRecord) return;
    const record = deletingRecord;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteMaintenanceRecordAction(
        record.id,
        record.vehicleId,
        record.scheduleId ?? undefined,
      );
      if (!result.ok) {
        setDeleteError(result.error ?? "Failed to delete record");
        return;
      }
      setDeletingRecord(null);
      router.refresh();
    });
  };

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <>
      <ol className="relative space-y-0">
        {events.map((event, index) => {
          const isFirst = index === 0;
          const date = new Date(event.date);
          const key = `${event.kind}-${event.kind === "maintenance" ? event.record.id : event.id}`;

          return (
            <li key={key} className="relative flex gap-4 pb-8 last:pb-0">
              {index < events.length - 1 ? (
                <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border" aria-hidden />
              ) : null}
              <span
                className={`relative z-10 mt-1.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 ${
                  isFirst ? "border-accent bg-accent shadow-sm shadow-accent/30" : "border-border bg-card"
                }`}
                aria-hidden
              />
              <article className={`min-w-0 flex-1 rounded-xl border p-4 transition ${eventTone(event.kind, isFirst)}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {formatDate(date, locale, { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {event.kind === "maintenance" ? event.record.serviceName : t(`eventTypes.${event.kind}`)}
                      {" - "}
                      {event.kind === "maintenance" ? event.record.vehicleName : event.vehicleName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isFirst ? (
                      <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        {t("latest")}
                      </span>
                    ) : null}
                    {event.kind === "maintenance" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingRecord(event.record)}
                          className="min-h-[32px] rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
                        >
                          {tMaintenance("edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingRecord(event.record);
                          }}
                          className="min-h-[32px] rounded-lg border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger transition hover:bg-danger/10"
                        >
                          {tMaintenance("deleteRecord")}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("odometer")}</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {event.odometerKm != null ? formatDistance(event.odometerKm, locale, settings.distanceUnit) : "-"}
                    </dd>
                  </div>
                  {event.kind === "fuel" ? (
                    <>
                      <div>
                        <dt className="text-xs text-muted-foreground">{t("cost")}</dt>
                        <dd className="font-medium tabular-nums text-foreground">
                          {formatCurrency(event.totalCostCents, event.currency, locale)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t("volume", { unit: volumeUnitLabel(settings.volumeUnit) })}
                        </dt>
                        <dd className="font-medium tabular-nums text-foreground">
                          {event.liters != null
                            ? formatVolume(event.liters, locale, settings.volumeUnit)
                            : "-"}
                        </dd>
                      </div>
                    </>
                  ) : null}
                  {event.kind === "maintenance" ? (
                    <>
                      <div>
                        <dt className="text-xs text-muted-foreground">{t("cost")}</dt>
                        <dd className="font-medium tabular-nums text-foreground">
                          {event.record.costCents > 0 ? formatCurrency(event.record.costCents, event.record.currency, locale) : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">{t("vendor")}</dt>
                        <dd className="font-medium text-foreground">{event.record.vendorName ?? "-"}</dd>
                      </div>
                    </>
                  ) : null}
                </dl>

                {event.kind === "fuel" && (event.stationName || event.note) ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {[event.stationName, event.note].filter(Boolean).join(" - ")}
                  </p>
                ) : null}
                {event.kind === "maintenance" && event.record.note ? (
                  <div
                    className="prose-sg mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(event.record.note) }}
                  />
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>

      {editingRecord ? (
        <EditMaintenanceRecordDialog
          record={editingRecord}
          open={Boolean(editingRecord)}
          onClose={() => setEditingRecord(null)}
        />
      ) : null}

      <Dialog
        open={Boolean(deletingRecord)}
        title={tMaintenance("deleteRecordTitle")}
        description={tMaintenance("deleteRecordConfirm")}
        confirmLabel={deletePending ? tMaintenance("deleting") : tMaintenance("confirmDelete")}
        cancelLabel={tMaintenance("cancel")}
        confirmVariant="danger"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRecord(null)}
      >
        {deleteError ? <Alert variant="error">{deleteError}</Alert> : null}
      </Dialog>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatDate } from "@/lib/regional/format";
import { renderMarkdownToSafeHtml } from "@/lib/notes/markdown";
import { EditMaintenanceRecordDialog } from "@/components/maintenance/EditMaintenanceRecordDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Alert } from "@/components/ui/Alert";
import { deleteMaintenanceRecordAction } from "@/lib/actions/maintenance";
import type { SerializedMaintenanceRecord } from "@/lib/repositories/maintenance-records";

type MaintenanceHistoryTimelineProps = {
  records: SerializedMaintenanceRecord[];
  compact?: boolean;
};

function ItemSummary({
  item,
}: {
  item: SerializedMaintenanceRecord["items"][number];
}) {
  const t = useTranslations("maintenance.items");
  const parts = [
    item.brand,
    item.productName,
    item.specification,
    item.partNumber ? `#${item.partNumber}` : null,
  ].filter(Boolean);
  const qty =
    item.quantity != null
      ? `${item.quantity}${item.unit ? ` ${item.unit === "CUSTOM" ? item.customUnit ?? "" : t(`unitsShort.${item.unit}`)}` : ""}`
      : null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-card px-2.5 py-1 text-[11px] text-foreground">
      <span className="font-medium">{item.name?.trim() || t(`categories.${item.category}`)}</span>
      {qty ? <span className="text-muted-foreground">· {qty}</span> : null}
      {parts.length > 0 ? <span className="text-muted-foreground">· {parts.join(" ")}</span> : null}
    </span>
  );
}

export function MaintenanceHistoryTimeline({
  records,
  compact = false,
}: MaintenanceHistoryTimelineProps) {
  const t = useTranslations("history");
  const tMaintenance = useTranslations("maintenance");
  const locale = useLocale();
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

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <>
      <ol className="relative space-y-0">
        {records.map((record, index) => {
          const isFirst = index === 0;
          const performedDate = new Date(record.performedAt);

          return (
            <li key={record.id} className="relative flex gap-4 pb-8 last:pb-0">
              {index < records.length - 1 ? (
                <span
                  className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border"
                  aria-hidden
                />
              ) : null}

              <span
                className={`relative z-10 mt-1.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 ${
                  isFirst
                    ? "border-accent bg-accent shadow-sm shadow-accent/30"
                    : "border-border bg-card"
                }`}
                aria-hidden
              />

              <article
                className={`min-w-0 flex-1 rounded-xl border p-4 transition ${
                  isFirst
                    ? "border-accent/30 bg-accent/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {formatDate(performedDate, locale, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {!compact ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {record.serviceName}
                        {record.vehicleName ? ` · ${record.vehicleName}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isFirst ? (
                      <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        {t("latest")}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setEditingRecord(record)}
                      className="min-h-[32px] rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
                    >
                      {tMaintenance("edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingRecord(record);
                      }}
                      className="min-h-[32px] rounded-lg border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger transition hover:bg-danger/10"
                    >
                      {tMaintenance("deleteRecord")}
                    </button>
                  </div>
                </div>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("odometer")}</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {record.odometerKm != null
                        ? `${record.odometerKm.toLocaleString(locale)} km`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("cost")}</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {record.costCents > 0
                        ? formatCurrency(record.costCents, record.currency, locale)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("vendor")}</dt>
                    <dd className="font-medium text-foreground">
                      {record.vendorName ?? "—"}
                    </dd>
                  </div>
                </dl>

                {record.items.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {record.items.map((item) => (
                      <ItemSummary key={item.id} item={item} />
                    ))}
                  </div>
                ) : null}

                {record.note ? (
                  <div
                    className="prose-sg mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(record.note) }}
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

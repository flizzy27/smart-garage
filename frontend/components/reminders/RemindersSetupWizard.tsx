"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setupWarningAction } from "@/lib/actions/maintenance";
import { CIRCA_MONTHS_OPTIONS } from "@/lib/maintenance/setup-estimate";
import { formatDateInputValue } from "@/lib/maintenance/setup-estimate";
import type { SerializedSchedule } from "@/lib/repositories/maintenance";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type RemindersSetupWizardProps = {
  open: boolean;
  onClose: () => void;
  queue: SerializedSchedule[];
};

export function RemindersSetupWizard({ open, onClose, queue }: RemindersSetupWizardProps) {
  const t = useTranslations("reminders.setup");
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [exactDate, setExactDate] = useState(() => formatDateInputValue(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set());

  const activeQueue = useMemo(
    () => queue.filter((item) => !skippedIds.has(item.id)),
    [queue, skippedIds],
  );

  const current = activeQueue[index] ?? null;
  const total = activeQueue.length;
  const progress = total > 0 ? index + 1 : 0;

  const resetAndClose = useCallback(() => {
    setIndex(0);
    setSkippedIds(new Set());
    setError(null);
    onClose();
  }, [onClose]);

  const advance = useCallback(() => {
    setError(null);
    setExactDate(formatDateInputValue(new Date()));
    if (index + 1 >= total) {
      resetAndClose();
      router.refresh();
      return;
    }
    setIndex((i) => i + 1);
  }, [index, total, resetAndClose, router]);

  const runAction = useCallback(
    (
      action: "done" | "circa" | "unknown" | "skip",
      extra?: { performedAt?: string; circaMonthsAgo?: number },
    ) => {
      if (!current) return;
      setError(null);
      startTransition(async () => {
        if (action === "skip") {
          setSkippedIds((prev) => new Set(prev).add(current.id));
          advance();
          return;
        }

        const result = await setupWarningAction({
          scheduleId: current.id,
          vehicleId: current.vehicleId,
          action,
          performedAt: extra?.performedAt,
          circaMonthsAgo: extra?.circaMonthsAgo,
        });

        if (!result.ok) {
          setError(result.error ?? t("error"));
          return;
        }

        advance();
      });
    },
    [advance, current, t],
  );

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={t("title")}
      description={
        current
          ? t("progress", { current: progress, total })
          : t("complete")
      }
      size="lg"
    >
      {!current ? (
        <div className="space-y-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">{t("complete")}</p>
          <Button type="button" onClick={resetAndClose}>
            {t("close")}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-lg font-semibold text-foreground">{current.name}</p>
            <p className="text-sm text-muted-foreground">{current.vehicleName}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {current.dueStatus === "OVERDUE"
                ? t("statusOverdue")
                : current.dueStatus === "DUE_SOON"
                  ? t("statusDueSoon")
                  : t("statusUnset")}
              {current.dueInDays != null ? ` · ${current.dueInDays}d` : ""}
              {current.dueInKm != null ? ` · ${current.dueInKm} km` : ""}
            </p>
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="space-y-2">
            <Label htmlFor="setup-exact-date">{t("exactDate")}</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="setup-exact-date"
                type="date"
                value={exactDate}
                onChange={(e) => setExactDate(e.target.value)}
                className="max-w-[11rem]"
              />
              <Button
                type="button"
                disabled={pending}
                onClick={() => runAction("done", { performedAt: exactDate })}
              >
                {t("done")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("circaTitle")}
            </p>
            <div className="flex flex-wrap gap-2">
              {CIRCA_MONTHS_OPTIONS.map((months) => (
                <Button
                  key={months}
                  type="button"
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  disabled={pending}
                  onClick={() => runAction("circa", { circaMonthsAgo: months })}
                >
                  {t(`circaMonths.${months}` as "circaMonths.3")}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              disabled={pending}
              onClick={() => runAction("unknown")}
            >
              {t("unknown")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              disabled={pending}
              onClick={() => runAction("skip")}
            >
              {t("skipService")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="ml-auto px-3 py-1.5 text-xs"
              disabled={pending}
              onClick={advance}
            >
              {t("later")}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">{t("unknownHint")}</p>
        </div>
      )}
    </Modal>
  );
}

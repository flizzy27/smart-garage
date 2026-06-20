"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { MaintenanceCategory } from "@prisma/client";
import {
  createScheduleAction,
  deleteScheduleAction,
  type MaintenanceActionResult,
} from "@/lib/actions/maintenance";
import {
  formatCostRange,
  formatIntervalLabel,
  templateDisplayName,
} from "@/lib/maintenance/display";
import { centsToEuros } from "@/lib/money";
import type { SerializedSchedule } from "@/lib/repositories/maintenance";
import { Link } from "@/lib/i18n/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type Template = {
  id: string;
  slug: string;
  category: MaintenanceCategory;
  nameEn: string;
  nameDe: string;
  descriptionEn: string | null;
  descriptionDe: string | null;
  defaultIntervalKm: number | null;
  defaultIntervalMonths: number | null;
  defaultCostCentsMin: bigint | null;
  defaultCostCentsMax: bigint | null;
};

type VehicleOption = {
  id: string;
  label: string;
  odometerKm: number;
};

type Props = {
  schedules: SerializedSchedule[];
  templates: Template[];
  vehicles: VehicleOption[];
  defaultVehicleId?: string;
};

const statusStyles = {
  OVERDUE: "border-danger/40 bg-danger-muted/40",
  DUE_SOON: "border-warning/40 bg-warning-muted/30",
  OK: "border-border bg-card",
};

export function MaintenanceBoard({ schedules, templates, vehicles, defaultVehicleId }: Props) {
  const t = useTranslations("maintenance");
  const locale = useLocale();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState(defaultVehicleId ?? "");

  const filteredSchedules = vehicleFilter
    ? schedules.filter((s) => s.vehicleId === vehicleFilter)
    : schedules;

  const [createState, createAction, creating] = useActionState<
    MaintenanceActionResult | null,
    FormData
  >(createScheduleAction, null);

  const template = templates.find((item) => item.id === selectedTemplate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("schedulesTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("schedulesSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {vehicles.length > 1 ? (
            <Select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              aria-label={t("vehicle")}
            >
              <option value="">{t("allVehicles")}</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.label}
                </option>
              ))}
            </Select>
          ) : null}
          <Button type="button" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? t("cancelAdd") : t("addSchedule")}
          </Button>
        </div>
      </div>

      {showAdd ? (
        <form
          action={createAction}
          className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          {createState?.error ? <Alert variant="error">{createState.error}</Alert> : null}
          {createState?.ok ? (
            <Alert variant="success">{t("scheduleCreated")}</Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehicleId" required>
                {t("vehicle")}
              </Label>
              <Select id="vehicleId" name="vehicleId" required defaultValue={vehicleFilter || vehicles[0]?.id}>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateId">{t("template")}</Label>
              <Select
                id="templateId"
                name="templateId"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <option value="">{t("customSchedule")}</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {templateDisplayName(item, locale as "en" | "de")}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {!selectedTemplate ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customName" required>
                  {t("customName")}
                </Label>
                <Input id="customName" name="customName" required placeholder={t("customNamePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t("category")}</Label>
                <Select id="category" name="category" defaultValue="OTHER">
                  {(["ENGINE", "FILTERS", "FLUIDS", "BRAKES", "TIRES", "INSPECTION", "ADDITIVE", "OTHER"] as const).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {t(`categories.${cat}`)}
                      </option>
                    ),
                  )}
                </Select>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="intervalKm">{t("intervalKm")}</Label>
              <Input
                id="intervalKm"
                name="intervalKm"
                type="number"
                min={0}
                defaultValue={template?.defaultIntervalKm ?? undefined}
                placeholder="15000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intervalMonths">{t("intervalMonths")}</Label>
              <Input
                id="intervalMonths"
                name="intervalMonths"
                type="number"
                min={0}
                defaultValue={template?.defaultIntervalMonths ?? undefined}
                placeholder="12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedCostEuros">{t("estimatedCost")}</Label>
              <Input
                id="estimatedCostEuros"
                name="estimatedCostEuros"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  template?.defaultCostCentsMin
                    ? centsToEuros(template.defaultCostCentsMin) ?? undefined
                    : undefined
                }
                placeholder="150.00"
              />
            </div>
          </div>

          {template ? (
            <p className="text-xs text-muted-foreground">
              {t("recommendedCost")}:{" "}
              {formatCostRange(
                template.defaultCostCentsMin,
                template.defaultCostCentsMax,
                "EUR",
                locale as "en" | "de",
              ) ?? "—"}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lastPerformedAt">{t("lastPerformed")}</Label>
              <Input id="lastPerformedAt" name="lastPerformedAt" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastOdometerKm">{t("lastOdometer")}</Label>
              <Input id="lastOdometerKm" name="lastOdometerKm" type="number" min={0} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <Button type="submit" disabled={creating || vehicles.length === 0}>
            {creating ? t("saving") : t("saveSchedule")}
          </Button>
        </form>
      ) : null}

      {filteredSchedules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredSchedules.map((schedule) => (
            <ScheduleCard key={schedule.id} schedule={schedule} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleCard({ schedule }: { schedule: SerializedSchedule }) {
  const t = useTranslations("maintenance");
  const locale = useLocale();
  const tone = schedule.dueStatus as keyof typeof statusStyles;

  return (
    <article
      className={`rounded-xl border p-4 transition ${statusStyles[tone] ?? statusStyles.OK}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/maintenance/${schedule.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground hover:underline">
              {schedule.name}
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t(`categories.${schedule.category}`)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{schedule.vehicleName}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatIntervalLabel(schedule.intervalKm, schedule.intervalMonths, locale as "en" | "de")}
          </p>
        </Link>
        <div className="text-right">
          <p
            className={`text-sm font-bold ${
              schedule.dueStatus === "OVERDUE"
                ? "text-danger"
                : schedule.dueStatus === "DUE_SOON"
                  ? "text-warning"
                  : "text-success"
            }`}
          >
            {t(`status.${schedule.dueStatus}`)}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {schedule.dueInDays != null
              ? t("dueInDays", { days: schedule.dueInDays })
              : schedule.dueInKm != null
                ? t("dueInKm", { km: schedule.dueInKm })
                : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/maintenance/${schedule.id}#log-service`}>
          <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs">
            {t("logOrHistory")}
          </Button>
        </Link>
        <Link href={`/maintenance/${schedule.id}`}>
          <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs">
            {t("viewHistory")}
          </Button>
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="px-3 py-1.5 text-xs"
          onClick={async () => {
            await deleteScheduleAction(schedule.id, schedule.vehicleId);
          }}
        >
          {t("remove")}
        </Button>
      </div>
    </article>
  );
}

"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  saveNotificationSettingsAction,
  testAllNotificationsAction,
  type NotificationActionResult,
} from "@/lib/actions/notifications";
import type { NotificationSettingsRecord } from "@/lib/repositories/notifications";
import { TIMEZONE_OPTIONS } from "@/lib/settings/types";
import { useUserSettings } from "@/providers/UserSettingsProvider";

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

type Props = {
  initial: NotificationSettingsRecord | null;
};

function ToggleRow({
  id,
  label,
  description,
  defaultChecked,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3 ${
        disabled ? "opacity-60" : "cursor-pointer"
      }`}
    >
      <div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <input
        id={id}
        name={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-1 h-4 w-4 rounded border-border accent-accent"
      />
    </label>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
      <div className="border-b border-border-subtle px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </section>
  );
}

export function NotificationSettings({ initial }: Props) {
  const t = useTranslations("pages.settings.notifications");
  const tDays = useTranslations("pages.settings.notifications.days");
  const { settings: userSettings } = useUserSettings();
  const scheduledDays = (initial?.scheduledDays ?? "MO,TU,WE,TH,FR,SA,SU").split(",");

  const [saveState, saveAction, saving] = useActionState<
    NotificationActionResult | null,
    FormData
  >(saveNotificationSettingsAction, null);
  const [testState, testAction, testing] = useActionState<
    NotificationActionResult | null,
    FormData
  >(testAllNotificationsAction, null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{t("testAllTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("testAllDescription")}</p>
        </div>
        <form action={testAction}>
          <Button type="submit" disabled={testing}>
            {testing ? t("sending") : t("testAllButton")}
          </Button>
        </form>
      </div>

      {testState?.error ? <Alert variant="error">{testState.error}</Alert> : null}
      {testState?.ok ? (
        <Alert variant="success">
          {t("testSuccessChannels", {
            channels: (testState.sentChannels ?? []).join(", "),
          })}
        </Alert>
      ) : null}
      {testState?.partialErrors?.length ? (
        <Alert variant="error">{testState.partialErrors.join("; ")}</Alert>
      ) : null}

      <form action={saveAction} className="space-y-6">
        {saveState?.error ? <Alert variant="error">{saveState.error}</Alert> : null}
        {saveState?.ok ? <Alert variant="success">{t("saved")}</Alert> : null}

        <input
          type="hidden"
          name="eventMaintenanceLogged"
          value="off"
        />
        <input type="hidden" name="eventExpenseAdded" value="off" />

        <SectionCard title={t("channelsTitle")} description={t("channelsDescription")}>
          <div className="space-y-4">
            <ToggleRow
              id="pushoverEnabled"
              label={t("pushoverEnabled")}
              description={t("pushoverChannelHint")}
              defaultChecked={initial?.pushoverEnabled ?? false}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pushoverUserKey">{t("pushoverUserKey")}</Label>
                <Input
                  id="pushoverUserKey"
                  name="pushoverUserKey"
                  defaultValue={initial?.pushoverUserKey ?? ""}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pushoverAppToken">{t("pushoverAppToken")}</Label>
                <Input
                  id="pushoverAppToken"
                  name="pushoverAppToken"
                  defaultValue={initial?.pushoverAppToken ?? ""}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-border-subtle pt-4">
            <ToggleRow
              id="telegramEnabled"
              label={t("telegramEnabled")}
              description={t("telegramChannelHint")}
              defaultChecked={initial?.telegramEnabled ?? false}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telegramBotToken">{t("telegramBotToken")}</Label>
                <Input
                  id="telegramBotToken"
                  name="telegramBotToken"
                  defaultValue={initial?.telegramBotToken ?? ""}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegramChatId">{t("telegramChatId")}</Label>
                <Input
                  id="telegramChatId"
                  name="telegramChatId"
                  defaultValue={initial?.telegramChatId ?? ""}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t("eventsTitle")} description={t("eventsDescription")}>
          <div className="space-y-3">
            <ToggleRow
              id="eventMaintenanceOverdue"
              label={t("eventMaintenanceOverdue")}
              description={t("eventMaintenanceOverdueHint")}
              defaultChecked={initial?.eventMaintenanceOverdue ?? true}
            />
            <ToggleRow
              id="eventMaintenanceDueSoon"
              label={t("eventMaintenanceDueSoon")}
              description={t("eventMaintenanceDueSoonHint")}
              defaultChecked={initial?.eventMaintenanceDueSoon ?? true}
            />
            <ToggleRow
              id="eventMaintenanceLogged"
              label={t("eventMaintenanceLogged")}
              description={t("eventMaintenanceLoggedHint")}
              defaultChecked={initial?.eventMaintenanceLogged ?? false}
              disabled
            />
            <ToggleRow
              id="eventExpenseAdded"
              label={t("eventExpenseAdded")}
              description={t("eventExpenseAddedHint")}
              defaultChecked={initial?.eventExpenseAdded ?? false}
              disabled
            />
          </div>
        </SectionCard>

        <SectionCard title={t("deliveryTitle")} description={t("deliveryDescription")}>
          <div className="space-y-3">
            <ToggleRow
              id="deliveryImmediate"
              label={t("deliveryImmediate")}
              description={t("deliveryImmediateHint")}
              defaultChecked={initial?.deliveryImmediate ?? true}
            />
            <ToggleRow
              id="deliveryScheduled"
              label={t("deliveryScheduled")}
              description={t("deliveryScheduledHint")}
              defaultChecked={initial?.deliveryScheduled ?? false}
            />
          </div>

          <div className="grid gap-4 border-t border-border-subtle pt-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduledTime">{t("scheduledTime")}</Label>
              <Input
                id="scheduledTime"
                name="scheduledTime"
                type="time"
                defaultValue={initial?.scheduledTime ?? "08:00"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minIntervalHours">{t("minIntervalHours")}</Label>
              <Select
                id="minIntervalHours"
                name="minIntervalHours"
                defaultValue={String(initial?.minIntervalHours ?? 6)}
              >
                <option value="0">{t("intervalImmediate")}</option>
                <option value="1">{t("interval1h")}</option>
                <option value="6">{t("interval6h")}</option>
                <option value="12">{t("interval12h")}</option>
                <option value="24">{t("interval24h")}</option>
                <option value="168">{t("interval7d")}</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("scheduledDays")}</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <label
                  key={day}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="scheduledDays"
                    value={day}
                    defaultChecked={scheduledDays.includes(day)}
                    className="h-4 w-4 accent-accent"
                  />
                  {tDays(day)}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-border-subtle pt-4">
            <ToggleRow
              id="quietHoursEnabled"
              label={t("quietHoursEnabled")}
              description={t("quietHoursHint")}
              defaultChecked={initial?.quietHoursEnabled ?? false}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quietHoursStart">{t("quietHoursStart")}</Label>
                <Input
                  id="quietHoursStart"
                  name="quietHoursStart"
                  type="time"
                  defaultValue={initial?.quietHoursStart ?? "22:00"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quietHoursEnd">{t("quietHoursEnd")}</Label>
                <Input
                  id="quietHoursEnd"
                  name="quietHoursEnd"
                  type="time"
                  defaultValue={initial?.quietHoursEnd ?? "07:00"}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border-subtle pt-4">
            <Label htmlFor="timezoneDisplay">{t("timezone")}</Label>
            <Select
              id="timezoneDisplay"
              name="timezone"
              defaultValue={initial?.timezone ?? userSettings.timezone}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">{t("timezoneHint")}</p>
          </div>
        </SectionCard>

        <Button type="submit" disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
      </form>
    </div>
  );
}

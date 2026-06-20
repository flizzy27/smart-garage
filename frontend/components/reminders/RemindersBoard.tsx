import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import type { SerializedSchedule } from "@/lib/repositories/maintenance";

const statusStyles = {
  OVERDUE: "border-danger/40 bg-danger-muted/30",
  DUE_SOON: "border-warning/40 bg-warning-muted/20",
  OK: "border-border bg-card",
} as const;

type Props = {
  schedules: SerializedSchedule[];
  locale: "en" | "de";
};

export async function RemindersBoard({ schedules, locale }: Props) {
  const t = await getTranslations("reminders");

  const dueItems = schedules.filter((s) => s.dueStatus !== "OK");

  return (
    <div className="space-y-4">
      {dueItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("allClear")}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {dueItems.map((item) => (
            <li key={item.id}>
              <Link href={`/maintenance/${item.id}`}>
                <Card
                  className={`transition hover:border-accent/40 ${statusStyles[item.dueStatus]}`}
                >
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.vehicleName}
                        {item.dueInDays != null
                          ? ` · ${t("dueInDays", { days: item.dueInDays })}`
                          : ""}
                        {item.dueInKm != null
                          ? ` · ${t("dueInKm", { km: item.dueInKm })}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        item.dueStatus === "OVERDUE"
                          ? "bg-danger-muted text-danger"
                          : "bg-warning-muted text-warning"
                      }`}
                    >
                      {item.dueStatus === "OVERDUE" ? t("overdue") : t("dueSoon")}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

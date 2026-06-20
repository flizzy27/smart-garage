import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { listDueInspectionsForUser } from "@/lib/repositories/inspections";

type Props = {
  locale: string;
};

export async function InspectionReminders({ locale }: Props) {
  const t = await getTranslations("reminders");
  const userId = await getCurrentUserId();
  const items = await listDueInspectionsForUser(userId, 60);
  const now = new Date();

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{t("inspectionsTitle")}</h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const overdue = item.nextDueAt < now;
          const vehicleName =
            [item.vehicle.make, item.vehicle.model].filter(Boolean).join(" ") ||
            item.vehicle.licensePlate ||
            item.vehicle.id;
          return (
            <li key={item.id}>
              <Link href={`/vehicles/${item.vehicle.id}`}>
                <Card
                  className={`transition hover:border-accent/40 ${
                    overdue
                      ? "border-danger/40 bg-danger-muted/30"
                      : "border-warning/40 bg-warning-muted/20"
                  }`}
                >
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {item.type === "HU" ? "HU / TÜV" : "AU"}
                      </p>
                      <p className="text-xs text-muted-foreground">{vehicleName}</p>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {t("inspectionDue", {
                        date: item.nextDueAt.toLocaleDateString(locale),
                      })}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

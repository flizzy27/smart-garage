import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

type VehicleHubModulesProps = {
  vehicleId: string;
  counts: {
    maintenance: number;
    expenses: number;
    documents: number;
    fuel: number;
  };
};

const modules = [
  { key: "maintenance", icon: "wrench", href: (id: string) => `/maintenance?vehicle=${id}` },
  { key: "expenses", icon: "currency", href: (id: string) => `/expenses?vehicle=${id}` },
  { key: "documents", icon: "document", href: (id: string) => `/documents?vehicle=${id}` },
  { key: "fuel", icon: "fuel", href: (id: string) => `/fuel?vehicle=${id}` },
  { key: "reminders", icon: "bell", href: () => "/reminders" },
] as const;

function ModuleIcon({ type }: { type: (typeof modules)[number]["icon"] }) {
  const paths: Record<(typeof modules)[number]["icon"], string> = {
    wrench:
      "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    currency:
      "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z",
    document:
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    fuel: "M13 10V3L4 14h7v7l9-11h-7z",
    bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  };

  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[type]} />
    </svg>
  );
}

export async function VehicleHubModules({
  vehicleId,
  counts,
}: VehicleHubModulesProps) {
  const t = await getTranslations("vehicles.hub");

  const countFor = (key: (typeof modules)[number]["key"]) => {
    if (key === "maintenance") return counts.maintenance;
    if (key === "expenses") return counts.expenses;
    if (key === "documents") return counts.documents;
    if (key === "fuel") return counts.fuel;
    return 0;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((module) => {
        const count = countFor(module.key);
        const href = module.href(vehicleId);
        return (
          <Card key={module.key}>
            <CardHeader bordered={false} className="pb-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <ModuleIcon type={module.icon} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-3">
              <h3 className="font-semibold text-foreground">
                {t(`modules.${module.key}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(`modules.${module.key}.description`)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("entryCount", { count })}
              </p>
              <Link
                href={href}
                className="inline-block text-sm font-medium text-accent hover:underline"
              >
                {t("openModule")}
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

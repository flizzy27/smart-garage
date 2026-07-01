"use client";

import { useTranslations } from "next-intl";
import { OdometerQuickUpdate } from "@/components/vehicles/OdometerQuickUpdate";

type Props = {
  vehicleId: string;
  currentKm: number;
  locale: string;
};

export function DashboardOdometerUpdate({ vehicleId, currentKm, locale }: Props) {
  const t = useTranslations("dashboard.primaryVehicle");

  return (
    <div>
      <dt className="text-muted-foreground">{t("odometer")}</dt>
      <dd>
        <OdometerQuickUpdate
          vehicleId={vehicleId}
          currentKm={currentKm}
          locale={locale}
          compact
        />
      </dd>
    </div>
  );
}

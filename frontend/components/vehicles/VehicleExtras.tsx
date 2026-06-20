"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
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

type QrProps = {
  vehicleId: string;
  vehicleName: string;
};

export function VehicleQrCode({ vehicleId, vehicleName }: QrProps) {
  const t = useTranslations("vehicles.qr");

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{t("title")}</p>
      <p className="text-xs text-muted-foreground text-center">{t("hint")}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/vehicles/${vehicleId}/qr`}
        alt={t("alt", { name: vehicleName })}
        className="h-40 w-40 rounded-lg border border-border bg-white p-2"
      />
      <Link
        href={`/vehicles/${vehicleId}`}
        className="text-xs text-accent hover:underline"
      >
        {t("openLink")}
      </Link>
    </div>
  );
}

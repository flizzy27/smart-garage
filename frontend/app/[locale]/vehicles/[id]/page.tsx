import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DeleteVehicleButton } from "@/components/vehicles/DeleteVehicleButton";
import { VehicleDetailOverview } from "@/components/vehicles/VehicleDetailOverview";
import { VehicleHubModules } from "@/components/vehicles/VehicleHubModules";
import { VehicleDetailPanels } from "@/components/vehicles/VehicleDetailPanels";
import { OdometerQuickUpdate } from "@/components/vehicles/OdometerQuickUpdate";
import { RelatedNotesCard } from "@/components/notes/RelatedNotesCard";
import { getVehicleForCurrentUser } from "@/lib/services/vehicles";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { resolveVehicleAccess } from "@/lib/vehicles/access";
import { listInspectionsForVehicle } from "@/lib/repositories/inspections";
import { listInsurancePoliciesForVehicle } from "@/lib/repositories/insurance";
import { listSharesForVehicle } from "@/lib/repositories/vehicle-shares";
import { getRelatedNotesForVehicle } from "@/lib/services/notes";
import {
  getVehicleDisplayName,
  serializeVehicle,
} from "@/lib/vehicles/serialize";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function VehicleDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vehicles");

  const record = await getVehicleForCurrentUser(id);
  if (!record) {
    notFound();
  }

  const userId = await getCurrentUserId();
  const access = await resolveVehicleAccess(userId, id);
  const vehicle = serializeVehicle(record);
  const title = getVehicleDisplayName(vehicle);
  const isOwner = access?.role === "OWNER";
  const canEdit = access?.canEdit ?? false;

  const [inspections, insurancePolicies, shares, relatedNotes] = await Promise.all([
    listInspectionsForVehicle(id, userId),
    listInsurancePoliciesForVehicle(id, userId),
    isOwner ? listSharesForVehicle(id, userId) : Promise.resolve([]),
    getRelatedNotesForVehicle(id, locale as "en" | "de"),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <PageHeader
        title={title}
        subtitle={t("detail.subtitle")}
        action={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/vehicles/${vehicle.id}/edit`}>
                <Button variant="secondary">{t("editVehicle")}</Button>
              </Link>
              {isOwner ? <DeleteVehicleButton vehicle={vehicle} /> : null}
            </div>
          ) : null
        }
      />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("detail.overview")}
        </h2>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <VehicleDetailOverview vehicle={vehicle} locale={locale} />
          {canEdit ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <OdometerQuickUpdate
                  vehicleId={vehicle.id}
                  currentKm={vehicle.currentOdometerKm}
                  locale={locale}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <VehicleDetailPanels
        vehicleId={vehicle.id}
        isOwner={isOwner}
        canEdit={canEdit}
        inspections={inspections.map((i) => ({
          id: i.id,
          type: i.type,
          nextDueAt: i.nextDueAt.toISOString(),
          lastPerformedAt: i.lastPerformedAt?.toISOString() ?? null,
          reminderWeeksBefore: i.reminderWeeksBefore,
          stickerNumber: i.stickerNumber,
          notes: i.notes,
        }))}
        insurancePolicies={insurancePolicies.map((p) => ({
          id: p.id,
          provider: p.provider,
          policyNumber: p.policyNumber,
          premiumCents: Number(p.premiumCents),
          currency: p.currency,
          sfClass: p.sfClass,
          coverageType: p.coverageType,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate.toISOString(),
          autoRenew: p.autoRenew,
          notes: p.notes,
        }))}
        shares={shares.map((s) => ({
          id: s.id,
          role: s.role,
          username: s.user.username,
          displayName: s.user.displayName,
        }))}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("hub.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("hub.subtitle")}</p>
        </div>
        <VehicleHubModules
          vehicleId={vehicle.id}
          counts={{
            maintenance: vehicle.maintenanceCount,
            expenses: vehicle.expenseCount,
            documents: vehicle.documentCount,
            fuel: vehicle.fuelCount,
            notes: vehicle.notesCount,
          }}
        />
      </section>

      <RelatedNotesCard
        notes={relatedNotes}
        locale={locale}
        newNoteHref={`/notes/new?vehicleId=${vehicle.id}`}
      />
    </div>
  );
}

import type { InspectionType, VehicleShareRole } from "@prisma/client";
import { VehicleInspectionsPanel } from "./VehicleInspectionsPanel";
import { VehicleInsurancePanel } from "./VehicleInsurancePanel";
import { VehicleSharingPanel } from "./VehicleSharingPanel";

export type SerializedInspection = {
  id: string;
  type: InspectionType;
  nextDueAt: string;
  lastPerformedAt: string | null;
  reminderWeeksBefore: number;
  stickerNumber: string | null;
  notes: string | null;
};

export type SerializedInsurance = {
  id: string;
  provider: string;
  policyNumber: string | null;
  premiumCents: number;
  currency: string;
  sfClass: string | null;
  coverageType: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  notes: string | null;
};

export type SerializedShare = {
  id: string;
  role: VehicleShareRole;
  username: string;
  displayName: string | null;
};

export function VehicleDetailPanels({
  vehicleId,
  isOwner,
  canEdit,
  inspections,
  insurancePolicies,
  shares,
}: {
  vehicleId: string;
  isOwner: boolean;
  canEdit: boolean;
  inspections: SerializedInspection[];
  insurancePolicies: SerializedInsurance[];
  shares: SerializedShare[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {canEdit ? (
        <VehicleInspectionsPanel
          vehicleId={vehicleId}
          inspections={inspections}
        />
      ) : null}
      {canEdit ? (
        <VehicleInsurancePanel
          vehicleId={vehicleId}
          policies={insurancePolicies}
        />
      ) : null}
      {isOwner ? (
        <VehicleSharingPanel vehicleId={vehicleId} shares={shares} />
      ) : null}
    </div>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  createInsurancePolicy,
  deleteInsurancePolicy,
} from "@/lib/repositories/insurance";
import type { InsuranceCoverageType } from "@prisma/client";

export async function saveInsuranceAction(
  vehicleId: string,
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    const provider = String(formData.get("provider") ?? "").trim();
    if (!provider) return { ok: false, error: "providerRequired" };

    const premiumEuros = Number(formData.get("premiumEuros"));
    if (Number.isNaN(premiumEuros) || premiumEuros < 0) {
      return { ok: false, error: "premiumInvalid" };
    }

    const startDate = new Date(String(formData.get("startDate")));
    const endDate = new Date(String(formData.get("endDate")));
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { ok: false, error: "dateInvalid" };
    }

    const coverageRaw = String(formData.get("coverageType") ?? "LIABILITY");
    const coverageType = coverageRaw as InsuranceCoverageType;

    const result = await createInsurancePolicy(vehicleId, userId, {
      provider,
      policyNumber: String(formData.get("policyNumber") ?? "") || null,
      premiumCents: BigInt(Math.round(premiumEuros * 100)),
      sfClass: String(formData.get("sfClass") ?? "") || null,
      coverageType,
      startDate,
      endDate,
      autoRenew: formData.get("autoRenew") === "on",
      notes: String(formData.get("notes") ?? "") || null,
    });

    if (!result) return { ok: false, error: "notAllowed" };

    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath("/costs");
    return { ok: true };
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export async function deleteInsuranceFormAction(formData: FormData) {
  const policyId = String(formData.get("policyId") ?? "");
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const userId = await getCurrentUserId();
  await deleteInsurancePolicy(policyId, userId);
  revalidatePath(`/vehicles/${vehicleId}`);
}

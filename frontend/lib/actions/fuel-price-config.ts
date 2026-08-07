"use server";

import { revalidatePath } from "next/cache";
import { saveFuelPriceApiKey } from "@/lib/services/fuel-price-config";

export type FuelPriceKeyResult = {
  ok: boolean;
  error?: "forbidden" | "invalid" | "failed";
};

export async function saveFuelPriceApiKeyAction(
  _previous: FuelPriceKeyResult | null,
  formData: FormData,
): Promise<FuelPriceKeyResult> {
  const removing = formData.get("remove") === "1";
  const raw = formData.get("apiKey");
  const value = removing ? "" : typeof raw === "string" ? raw : "";

  try {
    await saveFuelPriceApiKey(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FORBIDDEN") return { ok: false, error: "forbidden" };
    if (message === "INVALID_API_KEY") return { ok: false, error: "invalid" };
    return { ok: false, error: "failed" };
  }

  // The key gates what the fuel price page renders, so both it and this
  // settings page have to be re-rendered rather than served from the cache.
  revalidatePath("/[locale]/fuel-prices", "page");
  revalidatePath("/[locale]/settings/fuel-prices", "page");

  return { ok: true };
}

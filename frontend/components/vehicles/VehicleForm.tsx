"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BodyType, DriveType, FuelType } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  SearchCombobox,
  type ComboboxOption,
} from "@/components/ui/SearchCombobox";
import { Textarea } from "@/components/ui/Textarea";
import type { VehicleActionResult } from "@/lib/services/vehicles";
import type { SerializedVehicle } from "@/lib/vehicles/serialize";
import { getVehicleImageUrl } from "@/lib/vehicles/serialize";
import { Link, useRouter } from "@/lib/i18n/navigation";

const FUEL_TYPES = Object.values(FuelType);
const BODY_TYPES = Object.values(BodyType);
const DRIVE_TYPES = Object.values(DriveType);

type CatalogSelections = {
  manufacturer: ComboboxOption | null;
  series: ComboboxOption | null;
  generation: ComboboxOption | null;
  variant: ComboboxOption | null;
  engine: ComboboxOption | null;
  modelYear: ComboboxOption | null;
};

type ResolvedSpec = {
  engineCode: string | null;
  engineDescription: string;
  powerKw: number | null;
  powerPs: number | null;
  torqueNm: number | null;
  fuelType: FuelType | null;
  displacementCc: number | null;
  bodyType: BodyType | null;
  driveType: DriveType | null;
  productionYear: number;
};

type VehicleFormProps = {
  initialVehicle?: SerializedVehicle;
  initialSelections?: Partial<CatalogSelections>;
  action: (
    prevState: VehicleActionResult | null,
    formData: FormData,
  ) => Promise<VehicleActionResult | null>;
  cancelHref: string;
  submitLabel: string;
};

async function fetchCatalog<T>(
  path: string,
  params: Record<string, string>,
  limit = "500",
): Promise<T[]> {
  const search = new URLSearchParams({ ...params, limit });
  const response = await fetch(`${path}?${search}`);
  if (!response.ok) return [];
  const data = (await response.json()) as { results: T[] };
  return data.results;
}

async function fetchManufacturers(query: string): Promise<ComboboxOption[]> {
  const results = await fetchCatalog<{ id: string; name: string; country: string | null }>(
    "/api/catalog/manufacturers",
    { q: query },
    "300",
  );
  return results.map((item) => ({
    id: item.id,
    label: item.name,
    hint: item.country ?? undefined,
  }));
}

async function fetchSeries(
  manufacturerId: string,
  query: string,
): Promise<ComboboxOption[]> {
  const results = await fetchCatalog<{ id: string; name: string }>(
    "/api/catalog/series",
    { manufacturerId, q: query },
    "2000",
  );
  return results.map((item) => ({ id: item.id, label: item.name }));
}

async function fetchGenerations(
  seriesId: string,
  query: string,
): Promise<ComboboxOption[]> {
  const results = await fetchCatalog<{
    id: string;
    name: string;
    yearFrom: number;
    yearTo: number | null;
  }>("/api/catalog/generations", { seriesId, q: query }, "500");
  return results.map((item) => ({
    id: item.id,
    label: item.name,
    hint: item.yearTo ? `${item.yearFrom}–${item.yearTo}` : `${item.yearFrom}+`,
  }));
}

async function fetchVariants(
  generationId: string,
  query: string,
): Promise<ComboboxOption[]> {
  const results = await fetchCatalog<{ id: string; name: string }>(
    "/api/catalog/variants",
    { generationId, q: query },
    "500",
  );
  return results.map((item) => ({ id: item.id, label: item.name }));
}

async function fetchEngines(
  variantId: string,
  query: string,
): Promise<ComboboxOption[]> {
  const results = await fetchCatalog<{
    id: string;
    name: string;
    displacementCc: number | null;
    fuelType: FuelType | null;
  }>("/api/catalog/engines", { variantId, q: query }, "500");
  return results.map((item) => ({
    id: item.id,
    label: item.name,
    hint: item.displacementCc
      ? `${(item.displacementCc / 1000).toFixed(1)}L`
      : undefined,
  }));
}

async function fetchYears(
  variantId: string,
  engineId: string,
  query: string,
): Promise<ComboboxOption[]> {
  const results = await fetchCatalog<{ id: string; year: number }>(
    "/api/catalog/years",
    { variantId, engineId, q: query },
    "120",
  );
  return results.map((item) => ({
    id: item.id,
    label: String(item.year),
  }));
}

async function fetchResolvedSpec(
  modelYearId: string,
): Promise<ResolvedSpec | null> {
  const response = await fetch(`/api/catalog/resolve/${modelYearId}`);
  if (!response.ok) return null;
  const data = (await response.json()) as { spec: ResolvedSpec };
  return data.spec;
}

export function VehicleForm({
  initialVehicle,
  initialSelections = {},
  action,
  cancelHref,
  submitLabel,
}: VehicleFormProps) {
  const t = useTranslations("vehicles.form");
  const tFuel = useTranslations("vehicles.fuelTypes");
  const tBody = useTranslations("vehicles.bodyTypes");
  const tDrive = useTranslations("vehicles.driveTypes");
  const tErrors = useTranslations("vehicles.errors");
  const router = useRouter();

  const [state, formAction, pending] = useActionState<
    VehicleActionResult | null,
    FormData
  >(action, null);

  const [manufacturerId, setManufacturerId] = useState<string | null>(
    initialSelections.manufacturer?.id ?? initialVehicle?.manufacturerId ?? null,
  );
  const [seriesId, setSeriesId] = useState<string | null>(
    initialSelections.series?.id ?? initialVehicle?.seriesId ?? null,
  );
  const [generationId, setGenerationId] = useState<string | null>(
    initialSelections.generation?.id ?? initialVehicle?.generationId ?? null,
  );
  const [variantId, setVariantId] = useState<string | null>(
    initialSelections.variant?.id ?? initialVehicle?.variantId ?? null,
  );
  const [engineId, setEngineId] = useState<string | null>(
    initialSelections.engine?.id ?? initialVehicle?.engineId ?? null,
  );
  const [catalogModelYearId, setCatalogModelYearId] = useState<string | null>(
    initialSelections.modelYear?.id ?? initialVehicle?.catalogModelYearId ?? null,
  );

  const [spec, setSpec] = useState<ResolvedSpec | null>(null);
  const [specLoading, setSpecLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    getVehicleImageUrl(initialVehicle?.imageDocumentId ?? null),
  );

  const current = initialVehicle?.currentSpecs;

  useEffect(() => {
    if (!catalogModelYearId) {
      setSpec(null);
      return;
    }
    setSpecLoading(true);
    void fetchResolvedSpec(catalogModelYearId)
      .then(setSpec)
      .finally(() => setSpecLoading(false));
  }, [catalogModelYearId]);

  const errorCode =
    state && "success" in state && !state.success ? state.error.code : null;

  useEffect(() => {
    if (state?.success) {
      router.push(`/vehicles/${state.vehicleId}`);
    }
  }, [state, router]);

  const resetBelow = (level: "manufacturer" | "series" | "generation" | "variant" | "engine") => {
    if (level === "manufacturer") {
      setSeriesId(null);
      setGenerationId(null);
      setVariantId(null);
      setEngineId(null);
      setCatalogModelYearId(null);
    } else if (level === "series") {
      setGenerationId(null);
      setVariantId(null);
      setEngineId(null);
      setCatalogModelYearId(null);
    } else if (level === "generation") {
      setVariantId(null);
      setEngineId(null);
      setCatalogModelYearId(null);
    } else if (level === "variant") {
      setEngineId(null);
      setCatalogModelYearId(null);
    } else {
      setCatalogModelYearId(null);
    }
  };

  return (
    <form action={formAction} className="space-y-8">
      {errorCode ? (
        <Alert>
          {tErrors.has(errorCode as never)
            ? tErrors(errorCode as never)
            : tErrors("unknown")}
        </Alert>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          {t("sections.identity")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SearchCombobox
            name="manufacturerId"
            label={t("manufacturer")}
            required
            placeholder={t("selectManufacturer")}
            searchPlaceholder={t("searchManufacturer")}
            emptyMessage={t("noManufacturers")}
            loadingMessage={t("loading")}
            fetchOptions={fetchManufacturers}
            initialOption={initialSelections.manufacturer ?? null}
            onValueChange={(option) => {
              setManufacturerId(option?.id ?? null);
              resetBelow("manufacturer");
            }}
          />
          <SearchCombobox
            key={`series-${manufacturerId ?? "none"}`}
            name="seriesId"
            label={t("series")}
            required
            disabled={!manufacturerId}
            placeholder={t("selectSeries")}
            searchPlaceholder={t("searchSeries")}
            emptyMessage={t("noSeries")}
            loadingMessage={t("loading")}
            fetchOptions={(q) =>
              manufacturerId ? fetchSeries(manufacturerId, q) : Promise.resolve([])
            }
            initialOption={initialSelections.series ?? null}
            onValueChange={(option) => {
              setSeriesId(option?.id ?? null);
              resetBelow("series");
            }}
          />
          <SearchCombobox
            key={`gen-${seriesId ?? "none"}`}
            name="generationId"
            label={t("generation")}
            required
            disabled={!seriesId}
            placeholder={t("selectGeneration")}
            searchPlaceholder={t("searchGeneration")}
            emptyMessage={t("noGenerations")}
            loadingMessage={t("loading")}
            fetchOptions={(q) =>
              seriesId ? fetchGenerations(seriesId, q) : Promise.resolve([])
            }
            initialOption={initialSelections.generation ?? null}
            onValueChange={(option) => {
              setGenerationId(option?.id ?? null);
              resetBelow("generation");
            }}
          />
          <SearchCombobox
            key={`var-${generationId ?? "none"}`}
            name="variantId"
            label={t("variant")}
            required
            disabled={!generationId}
            placeholder={t("selectVariant")}
            searchPlaceholder={t("searchVariant")}
            emptyMessage={t("noVariants")}
            loadingMessage={t("loading")}
            fetchOptions={(q) =>
              generationId ? fetchVariants(generationId, q) : Promise.resolve([])
            }
            initialOption={initialSelections.variant ?? null}
            onValueChange={(option) => {
              setVariantId(option?.id ?? null);
              resetBelow("variant");
            }}
          />
          <SearchCombobox
            key={`eng-${variantId ?? "none"}`}
            name="engineId"
            label={t("engine")}
            required
            disabled={!variantId}
            placeholder={t("selectEngine")}
            searchPlaceholder={t("searchEngine")}
            emptyMessage={t("noEngines")}
            loadingMessage={t("loading")}
            fetchOptions={(q) =>
              variantId ? fetchEngines(variantId, q) : Promise.resolve([])
            }
            initialOption={initialSelections.engine ?? null}
            onValueChange={(option) => {
              setEngineId(option?.id ?? null);
              resetBelow("engine");
            }}
          />
          <SearchCombobox
            key={`year-${variantId ?? "none"}-${engineId ?? "none"}`}
            name="catalogModelYearId"
            label={t("productionYear")}
            required
            disabled={!variantId || !engineId}
            placeholder={t("selectYear")}
            searchPlaceholder={t("searchYear")}
            emptyMessage={t("noYears")}
            loadingMessage={t("loading")}
            fetchOptions={(q) =>
              variantId && engineId
                ? fetchYears(variantId, engineId, q)
                : Promise.resolve([])
            }
            initialOption={initialSelections.modelYear ?? null}
            onValueChange={(option) => {
              setCatalogModelYearId(option?.id ?? null);
            }}
          />
          <div className="space-y-2">
            <Label htmlFor="color">{t("color")}</Label>
            <Input
              id="color"
              name="color"
              defaultValue={initialVehicle?.color ?? ""}
              placeholder={t("colorPlaceholder")}
            />
          </div>
        </div>
        {specLoading ? (
          <p className="text-sm text-muted-foreground">{t("loadingSpecs")}</p>
        ) : spec ? (
          <p className="text-sm text-muted-foreground">{t("specsLoaded")}</p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          {t("sections.registration")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vin">{t("vin")}</Label>
            <Input
              id="vin"
              name="vin"
              maxLength={17}
              defaultValue={initialVehicle?.vin ?? ""}
              placeholder="WVWZZZ1JZYW000000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hsn">{t("hsn")}</Label>
            <Input
              id="hsn"
              name="hsn"
              maxLength={4}
              defaultValue={initialVehicle?.hsn ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tsn">{t("tsn")}</Label>
            <Input
              id="tsn"
              name="tsn"
              maxLength={3}
              defaultValue={initialVehicle?.tsn ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="licensePlate">{t("licensePlate")}</Label>
            <Input
              id="licensePlate"
              name="licensePlate"
              defaultValue={initialVehicle?.licensePlate ?? ""}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          {t("sections.technical")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("technicalHint")}</p>
        <input
          type="hidden"
          name="productionYear"
          value={spec?.productionYear ?? initialVehicle?.productionYear ?? ""}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="engineCode">{t("engineCode")}</Label>
            <Input
              id="engineCode"
              name="engineCode"
              key={`engineCode-${spec?.engineCode ?? "empty"}`}
              defaultValue={current?.engineCode ?? spec?.engineCode ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="engineDescription">{t("engineDescription")}</Label>
            <Input
              id="engineDescription"
              name="engineDescription"
              key={`engineDesc-${spec?.engineDescription ?? "empty"}`}
              defaultValue={
                current?.engineDescription ?? spec?.engineDescription ?? ""
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="powerPs">{t("powerPs")}</Label>
            <Input
              id="powerPs"
              name="powerPs"
              type="number"
              min={0}
              max={3000}
              key={`powerPs-${spec?.powerPs ?? "empty"}`}
              defaultValue={current?.powerPs ?? spec?.powerPs ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="powerKw">{t("powerKw")}</Label>
            <Input
              id="powerKw"
              name="powerKw"
              type="number"
              min={0}
              max={2000}
              key={`powerKw-${spec?.powerKw ?? "empty"}`}
              defaultValue={current?.powerKw ?? spec?.powerKw ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="torqueNm">{t("torqueNm")}</Label>
            <Input
              id="torqueNm"
              name="torqueNm"
              type="number"
              min={0}
              max={5000}
              key={`torque-${spec?.torqueNm ?? "empty"}`}
              defaultValue={current?.torqueNm ?? spec?.torqueNm ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displacementCc">{t("displacement")}</Label>
            <Input
              id="displacementCc"
              name="displacementCc"
              type="number"
              min={0}
              max={20000}
              key={`disp-${spec?.displacementCc ?? "empty"}`}
              defaultValue={current?.displacementCc ?? spec?.displacementCc ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuelType">{t("fuelType")}</Label>
            <Select
              id="fuelType"
              name="fuelType"
              key={`fuel-${spec?.fuelType ?? "empty"}`}
              defaultValue={current?.fuelType ?? spec?.fuelType ?? ""}
            >
              <option value="">{t("selectFuelType")}</option>
              {FUEL_TYPES.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {tFuel(fuel)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bodyType">{t("bodyType")}</Label>
            <Select
              id="bodyType"
              name="bodyType"
              key={`body-${spec?.bodyType ?? "empty"}`}
              defaultValue={current?.bodyType ?? spec?.bodyType ?? ""}
            >
              <option value="">{t("selectBodyType")}</option>
              {BODY_TYPES.map((body) => (
                <option key={body} value={body}>
                  {tBody(body)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="driveType">{t("driveType")}</Label>
            <Select
              id="driveType"
              name="driveType"
              key={`drive-${spec?.driveType ?? "empty"}`}
              defaultValue={current?.driveType ?? spec?.driveType ?? ""}
            >
              <option value="">{t("selectDriveType")}</option>
              {DRIVE_TYPES.map((drive) => (
                <option key={drive} value={drive}>
                  {tDrive(drive)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentOdometerKm" required>
              {t("mileage")}
            </Label>
            <Input
              id="currentOdometerKm"
              name="currentOdometerKm"
              type="number"
              min={0}
              required
              defaultValue={initialVehicle?.currentOdometerKm ?? 0}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          {t("sections.image")}
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-40 w-full max-w-xs items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("noImage")}
              </span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="image">{t("image")}</Label>
            <Input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  setPreviewUrl(
                    getVehicleImageUrl(initialVehicle?.imageDocumentId ?? null),
                  );
                  return;
                }
                setPreviewUrl(URL.createObjectURL(file));
              }}
            />
            <p className="text-xs text-muted-foreground">{t("imageHint")}</p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={initialVehicle?.notes ?? ""}
        />
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {t("cancel")}
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}

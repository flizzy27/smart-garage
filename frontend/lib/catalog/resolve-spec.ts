import type { BodyType, DriveType, FuelType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kwToPs } from "@/lib/catalog/parse-style";

export type ResolvedCatalogSpec = {
  catalogModelYearId: string;
  manufacturerId: string;
  manufacturerName: string;
  seriesId: string;
  seriesName: string;
  generationId: string;
  generationName: string;
  variantId: string;
  variantName: string;
  engineId: string;
  engineName: string;
  year: number;
  make: string;
  model: string;
  productionYear: number;
  engineCode: string | null;
  engineDescription: string;
  powerKw: number | null;
  powerPs: number | null;
  torqueNm: number | null;
  fuelType: FuelType | null;
  displacementCc: number | null;
  bodyType: BodyType | null;
  driveType: DriveType | null;
  transmissionTypes: string[] | null;
  productionYearFrom: number;
  productionYearTo: number | null;
  rawCatalog: Record<string, unknown>;
};

export async function resolveCatalogModelYear(
  catalogModelYearId: string,
): Promise<ResolvedCatalogSpec | null> {
  const row = await prisma.catalogModelYear.findUnique({
    where: { id: catalogModelYearId },
    include: {
      engine: true,
      variant: {
        include: {
          generation: {
            include: {
              series: {
                include: { manufacturer: true },
              },
            },
          },
        },
      },
    },
  });

  if (!row) return null;

  const { variant } = row;
  const { generation } = variant;
  const { series } = generation;
  const { manufacturer } = series;

  const transmissionTypes = parseTransmissionTypes(row.engine.transmissionTypes);

  return {
    catalogModelYearId: row.id,
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.name,
    seriesId: series.id,
    seriesName: series.name,
    generationId: generation.id,
    generationName: generation.name,
    variantId: variant.id,
    variantName: variant.name,
    engineId: row.engine.id,
    engineName: row.engine.name,
    year: row.year,
    make: manufacturer.name,
    model: series.name,
    productionYear: row.year,
    engineCode: row.engine.code,
    engineDescription: row.engine.name,
    powerKw: row.engine.powerKw,
    powerPs: row.engine.powerPs ?? (row.engine.powerKw != null ? kwToPs(row.engine.powerKw) : null),
    torqueNm: row.engine.torqueNm,
    fuelType: row.engine.fuelType,
    displacementCc: row.engine.displacementCc,
    bodyType: variant.bodyType,
    driveType: variant.driveType,
    transmissionTypes,
    productionYearFrom: generation.yearFrom,
    productionYearTo: generation.yearTo,
    rawCatalog: {
      source: row.source,
      manufacturer: manufacturer.name,
      series: series.name,
      generation: generation.name,
      variant: variant.name,
      engine: row.engine.name,
      year: row.year,
    },
  };
}

function parseTransmissionTypes(value: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return null;
}

export function computeCurrentPowerFromModifications(
  factoryPowerKw: number | null,
  factoryPowerPs: number | null,
  modifications: Array<{ addedPowerKw: number | null; addedPowerPs: number | null }>,
): { powerKw: number | null; powerPs: number | null } {
  let addedKw = 0;
  let addedPs = 0;
  let hasKw = false;
  let hasPs = false;

  for (const mod of modifications) {
    if (mod.addedPowerKw != null) {
      addedKw += mod.addedPowerKw;
      hasKw = true;
    }
    if (mod.addedPowerPs != null) {
      addedPs += mod.addedPowerPs;
      hasPs = true;
    }
  }

  return {
    powerKw:
      factoryPowerKw != null
        ? factoryPowerKw + (hasKw ? addedKw : 0)
        : hasKw
          ? addedKw
          : null,
    powerPs:
      factoryPowerPs != null
        ? factoryPowerPs + (hasPs ? addedPs : 0)
        : hasPs
          ? addedPs
          : null,
  };
}

export function computeCurrentTorqueFromModifications(
  factoryTorqueNm: number | null,
  modifications: Array<{ addedTorqueNm: number | null }>,
): number | null {
  let added = 0;
  let hasAdded = false;
  for (const mod of modifications) {
    if (mod.addedTorqueNm != null) {
      added += mod.addedTorqueNm;
      hasAdded = true;
    }
  }
  if (factoryTorqueNm != null) return factoryTorqueNm + (hasAdded ? added : 0);
  return hasAdded ? added : null;
}

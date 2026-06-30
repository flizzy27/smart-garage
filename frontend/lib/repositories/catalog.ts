import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dedupeManufacturersByName } from "@/lib/catalog/dedup-catalog";

const MANUFACTURER_ALIASES: Record<string, string[]> = {
  vw: ["volkswagen"],
  vag: ["volkswagen", "audi", "skoda", "seat", "cupra"],
  mb: ["mercedes-benz"],
  benz: ["mercedes-benz"],
  mercedes: ["mercedes-benz"],
  merc: ["mercedes-benz"],
  chevy: ["chevrolet"],
  beemer: ["bmw"],
  bimmer: ["bmw"],
  alfa: ["alfa-romeo"],
  landrover: ["land-rover"],
  "land rover": ["land-rover"],
  vauxhall: ["vauxhall", "opel"],
};

function resolveSearchAliases(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const noSpaces = normalized.replace(/\s+/g, "");
  return MANUFACTURER_ALIASES[normalized] ?? MANUFACTURER_ALIASES[noSpaces] ?? [];
}

type CatalogLevel =
  | "manufacturers"
  | "series"
  | "generations"
  | "variants"
  | "engines"
  | "years";

const LIMITS: Record<CatalogLevel, { default: number; max: number; empty: number }> = {
  manufacturers: { default: 80, max: 300, empty: 300 },
  series: { default: 500, max: 2000, empty: 2000 },
  generations: { default: 200, max: 500, empty: 500 },
  variants: { default: 200, max: 500, empty: 500 },
  engines: { default: 200, max: 500, empty: 500 },
  years: { default: 60, max: 120, empty: 120 },
};

function clampLimit(level: CatalogLevel, limit?: number, hasQuery = false) {
  const config = LIMITS[level];
  if (!limit || limit < 1) {
    return hasQuery ? config.default : config.empty;
  }
  return Math.min(limit, config.max);
}

export async function searchCatalogManufacturers(query: string, limit?: number) {
  const trimmed = query.trim();
  const take = clampLimit("manufacturers", limit, trimmed.length > 0);

  let whereClause: Prisma.CatalogManufacturerWhereInput | undefined;

  if (trimmed) {
    const aliases = resolveSearchAliases(trimmed);
    const orClauses: Prisma.CatalogManufacturerWhereInput[] = [
      { name: { contains: trimmed } },
      { slug: { contains: trimmed.toLowerCase().replace(/\s+/g, "-") } },
    ];
    if (aliases.length > 0) {
      orClauses.push({ slug: { in: aliases } });
    }
    whereClause = { OR: orClauses };
  }

  const rows = await prisma.catalogManufacturer.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    take: trimmed ? take * 3 : take,
    select: { id: true, name: true, country: true, source: true },
  });

  return dedupeManufacturersByName(rows).slice(0, take);
}

export async function searchCatalogSeries(
  manufacturerId: string,
  query: string,
  limit?: number,
) {
  const trimmed = query.trim();
  const take = clampLimit("series", limit, trimmed.length > 0);

  return prisma.catalogSeries.findMany({
    where: {
      manufacturerId,
      ...(trimmed ? { name: { contains: trimmed } } : {}),
    },
    orderBy: { name: "asc" },
    take,
    select: { id: true, name: true },
  });
}

export async function searchCatalogGenerations(
  seriesId: string,
  query: string,
  limit?: number,
) {
  const trimmed = query.trim();
  const take = clampLimit("generations", limit, trimmed.length > 0);

  return prisma.catalogGeneration.findMany({
    where: {
      seriesId,
      ...(trimmed ? { name: { contains: trimmed } } : {}),
    },
    orderBy: [{ yearFrom: "desc" }],
    take,
    select: {
      id: true,
      name: true,
      code: true,
      yearFrom: true,
      yearTo: true,
    },
  });
}

export async function searchCatalogVariants(
  generationId: string,
  query: string,
  limit?: number,
) {
  const trimmed = query.trim();
  const take = clampLimit("variants", limit, trimmed.length > 0);

  return prisma.catalogVariant.findMany({
    where: {
      generationId,
      ...(trimmed ? { name: { contains: trimmed } } : {}),
    },
    orderBy: { name: "asc" },
    take,
    select: {
      id: true,
      name: true,
      trim: true,
      bodyType: true,
      driveType: true,
    },
  });
}

export async function searchCatalogEngines(
  variantId: string,
  query: string,
  limit?: number,
) {
  const trimmed = query.trim();
  const take = clampLimit("engines", limit, trimmed.length > 0);

  return prisma.catalogEngine.findMany({
    where: {
      variantId,
      ...(trimmed ? { name: { contains: trimmed } } : {}),
    },
    orderBy: { name: "asc" },
    take,
    select: {
      id: true,
      name: true,
      code: true,
      displacementCc: true,
      fuelType: true,
      powerKw: true,
      powerPs: true,
      torqueNm: true,
    },
  });
}

export async function searchCatalogYears(
  variantId: string,
  engineId: string,
  query: string,
  limit?: number,
) {
  const trimmed = query.trim();
  const take = clampLimit("years", limit, trimmed.length > 0);
  const yearFilter = trimmed ? Number(trimmed) : null;

  return prisma.catalogModelYear.findMany({
    where: {
      variantId,
      engineId,
      ...(yearFilter && !Number.isNaN(yearFilter) ? { year: yearFilter } : {}),
    },
    orderBy: { year: "desc" },
    take,
    select: { id: true, year: true },
  });
}

export async function searchCatalogYearsForSeries(
  seriesId: string,
  query: string,
  limit?: number,
): Promise<Array<{ id: string; year: number }>> {
  const trimmed = query.trim();
  const take = clampLimit("years", limit, trimmed.length > 0);
  const yearFilter = trimmed ? Number(trimmed) : null;

  const rows = await prisma.catalogModelYear.findMany({
    where: {
      variant: { generation: { seriesId } },
      ...(yearFilter && !Number.isNaN(yearFilter) ? { year: yearFilter } : {}),
    },
    orderBy: [{ year: "desc" }, { id: "asc" }],
    select: { year: true },
    take: take * 8,
  });

  const seen = new Set<number>();
  const unique: number[] = [];
  for (const row of rows) {
    if (!seen.has(row.year)) {
      seen.add(row.year);
      unique.push(row.year);
    }
  }

  return unique
    .sort((a, b) => b - a)
    .slice(0, take)
    .map((year) => ({ id: String(year), year }));
}

export type CatalogConfigEntry = {
  modelYearId: string;
  generationId: string;
  variantId: string;
  engineId: string;
  variantName: string;
  engineName: string;
  powerPs: number | null;
  powerKw: number | null;
  fuelType: string | null;
  bodyType: string | null;
  driveType: string | null;
  displacementCc: number | null;
  engineCode: string | null;
  cylinders: number | null;
  doors: number | null;
  seats: number | null;
};

export async function getConfigsForYear(
  seriesId: string,
  year: number,
): Promise<CatalogConfigEntry[]> {
  const rows = await prisma.catalogModelYear.findMany({
    where: {
      year,
      variant: { generation: { seriesId } },
    },
    select: {
      id: true,
      variant: {
        select: {
          id: true,
          name: true,
          bodyType: true,
          driveType: true,
          doors: true,
          seats: true,
          generation: { select: { id: true } },
        },
      },
      engine: {
        select: {
          id: true,
          name: true,
          powerPs: true,
          powerKw: true,
          fuelType: true,
          displacementCc: true,
          code: true,
          cylinders: true,
        },
      },
    },
  });

  const seen = new Set<string>();
  const unique: CatalogConfigEntry[] = [];
  for (const row of rows) {
    const key = `${row.variant.id}:${row.engine.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      modelYearId: row.id,
      generationId: row.variant.generation.id,
      variantId: row.variant.id,
      engineId: row.engine.id,
      variantName: row.variant.name,
      engineName: row.engine.name,
      powerPs: row.engine.powerPs,
      powerKw: row.engine.powerKw,
      fuelType: row.engine.fuelType,
      bodyType: row.variant.bodyType,
      driveType: row.variant.driveType,
      displacementCc: row.engine.displacementCc,
      engineCode: row.engine.code,
      cylinders: row.engine.cylinders,
      doors: row.variant.doors,
      seats: row.variant.seats,
    });
  }

  return unique.sort((a, b) => {
    const psA = a.powerPs ?? a.powerKw ?? 0;
    const psB = b.powerPs ?? b.powerKw ?? 0;
    return psA - psB;
  });
}

export async function findCatalogManufacturerById(id: string) {
  return prisma.catalogManufacturer.findUnique({
    where: { id },
    select: { id: true, name: true, country: true },
  });
}

export async function findCatalogSeriesById(id: string) {
  return prisma.catalogSeries.findUnique({
    where: { id },
    select: { id: true, name: true, manufacturerId: true },
  });
}

export async function findCatalogGenerationById(id: string) {
  return prisma.catalogGeneration.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      seriesId: true,
      yearFrom: true,
      yearTo: true,
    },
  });
}

export async function findCatalogVariantById(id: string) {
  return prisma.catalogVariant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      generationId: true,
      bodyType: true,
      driveType: true,
    },
  });
}

export async function findCatalogEngineById(id: string) {
  return prisma.catalogEngine.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      variantId: true,
      code: true,
      displacementCc: true,
      fuelType: true,
      powerKw: true,
      powerPs: true,
      torqueNm: true,
    },
  });
}

export async function findCatalogModelYearById(id: string) {
  return prisma.catalogModelYear.findUnique({
    where: { id },
    select: { id: true, year: true, variantId: true, engineId: true },
  });
}

export async function getCatalogStats() {
  const [manufacturers, series, modelYears] = await Promise.all([
    prisma.catalogManufacturer.count(),
    prisma.catalogSeries.count(),
    prisma.catalogModelYear.count(),
  ]);
  return { manufacturers, series, modelYears };
}

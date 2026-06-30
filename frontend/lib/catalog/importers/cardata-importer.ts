import type {
  BodyType,
  CatalogDataSource,
  DriveType,
  FuelType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import {
  buildEngineName,
  buildTransmissionTypes,
  buildVariantLabel,
  expandYearRange,
  formatGenerationName,
  isValidCardataModel,
  mapCardataBodyType,
  mapCardataDriveType,
  mapCardataFuelType,
  parseCardataAspiration,
  parseCardataDisplacementCc,
  parseCardataInt,
  parseCardataPower,
  parseCardataTorque,
  parseCardataYear,
} from "@/lib/catalog/parse-cardata";
import {
  dedupeCardataRows,
  runCatalogDedup,
} from "@/lib/catalog/dedup-catalog";
import { slugify } from "@/lib/catalog/slug";
import {
  CARDATA_DATASET_VERSION,
  type CardataMakeSlug,
  type CardataRow,
  loadCardataRows,
  makeSlugToDisplayName,
  resolveCardataMakeSlugs,
} from "@/lib/catalog/sources/cardata-wiki";

export type CardataImportOptions = {
  makeSlugs?: CardataMakeSlug[];
  fetch?: boolean;
  replaceExisting?: boolean;
  onProgress?: (message: string) => void;
};

export type CardataImportStats = {
  manufacturers: number;
  series: number;
  generations: number;
  variants: number;
  engines: number;
  modelYears: number;
  rowsSkipped: number;
  rowsProcessed: number;
  csvDuplicatesRemoved: number;
};

const SOURCE: CatalogDataSource = "CARDATA_WIKI";
const BATCH_SIZE = 500;

type GenerationCache = Map<string, string>;
type VariantCache = Map<string, string>;
type EngineCache = Map<string, string>;

export async function importCardataWiki(
  prisma: PrismaClient,
  options: CardataImportOptions = {},
): Promise<CardataImportStats> {
  const log = options.onProgress ?? (() => {});
  const stats: CardataImportStats = {
    manufacturers: 0,
    series: 0,
    generations: 0,
    variants: 0,
    engines: 0,
    modelYears: 0,
    rowsSkipped: 0,
    rowsProcessed: 0,
    csvDuplicatesRemoved: 0,
  };

  const makeSlugs = await resolveCardataMakeSlugs(options.makeSlugs);

  const run = await prisma.catalogImportRun.create({
    data: {
      source: SOURCE,
      status: "RUNNING",
      metadata: { makes: makeSlugs, fetch: options.fetch ?? false },
    },
  });

  try {
    for (const makeSlug of makeSlugs) {
      const displayName = makeSlugToDisplayName(makeSlug);
      log(`Loading ${displayName} (${makeSlug}) from cardata.wiki…`);

      if (options.replaceExisting === true) {
        await clearManufacturerBySlug(prisma, makeSlug);
      }

      const rawRows = await loadCardataRows(makeSlug, { fetch: options.fetch });
      const { rows, duplicatesRemoved } = dedupeCardataRows(rawRows);
      stats.csvDuplicatesRemoved += duplicatesRemoved;
      log(`  ${rawRows.length} CSV rows (${duplicatesRemoved} CSV duplicates removed)`);

      if (rows.length === 0) {
        log(`  Skipping ${makeSlug} — no valid rows`);
        continue;
      }

      const csvMakeName = rows.find((row) => row.make?.trim())?.make?.trim() ?? displayName;
      const manufacturerId = await upsertManufacturer(prisma, makeSlug, csvMakeName);
      stats.manufacturers++;

      const seriesCache = new Map<string, string>();
      const generationCache: GenerationCache = new Map();
      const variantCache: VariantCache = new Map();
      const engineCache: EngineCache = new Map();
      let makeRowsProcessed = 0;

      for (const row of rows) {
        if (!isValidCardataRow(row, csvMakeName)) {
          stats.rowsSkipped++;
          continue;
        }

        stats.rowsProcessed++;
        makeRowsProcessed++;

        const seriesKey = row.model.trim();
        let seriesId = seriesCache.get(seriesKey);
        if (!seriesId) {
          seriesId = await upsertSeries(prisma, manufacturerId, seriesKey);
          seriesCache.set(seriesKey, seriesId);
          stats.series++;
        }

        const yearFrom = parseCardataYear(row.yearFrom)!;
        const yearToRaw = row.yearTo?.trim();
        const yearTo = yearToRaw ? parseCardataYear(yearToRaw) : null;

        const genKey = `${seriesId}:${yearFrom}:${yearTo ?? ""}`;
        let generationId = generationCache.get(genKey);
        if (!generationId) {
          generationId = await upsertGeneration(
            prisma,
            seriesId,
            formatGenerationName(yearFrom, yearTo),
            yearFrom,
            yearTo,
          );
          generationCache.set(genKey, generationId);
          stats.generations++;
        }

        const variantLabel = buildVariantLabel(row);
        const variantKey = `${generationId}:${variantLabel}`;
        let variantId = variantCache.get(variantKey);
        if (!variantId) {
          variantId = await upsertVariant(prisma, generationId, {
            name: variantLabel,
            bodyType: mapCardataBodyType(row),
            driveType: mapCardataDriveType(row),
            doors: parseCardataInt(row.doors),
            seats: parseCardataInt(row.seats),
            externalId: slugify(`${seriesKey}-${variantLabel}`).slice(0, 120),
          });
          variantCache.set(variantKey, variantId);
          stats.variants++;
        }

        const engineLabel = buildEngineName(row);
        const engineKey = `${variantId}:${engineLabel}`;
        let engineId = engineCache.get(engineKey);
        if (!engineId) {
          const { powerKw, powerPs } = parseCardataPower(row);
          engineId = await upsertEngine(prisma, variantId, {
            name: engineLabel,
            code: row.engineCode?.trim() || null,
            displacementCc: parseCardataDisplacementCc(row),
            fuelType: mapCardataFuelType(row),
            powerKw,
            powerPs,
            torqueNm: parseCardataTorque(row),
            cylinders: parseCardataInt(row.engineCylinders),
            valves: parseCardataInt(row.engineValves),
            aspiration: parseCardataAspiration(row),
            transmissionTypes: buildTransmissionTypes(row),
            externalId: slugify(`${variantLabel}-${engineLabel}`).slice(0, 120),
          });
          engineCache.set(engineKey, engineId);
          stats.engines++;
        }

        const modelYearRows = expandYearRange(yearFrom, yearTo).map((year) => ({
          variantId,
          engineId,
          year,
          source: SOURCE,
        }));

        stats.modelYears += await flushModelYears(prisma, modelYearRows);
      }

      log(`  Imported ${displayName}: ${makeRowsProcessed} variants`);
    }

    log("Running catalog deduplication…");
    const dedup = await runCatalogDedup(prisma, log);

    await prisma.catalogSyncState.upsert({
      where: { source: SOURCE },
      create: {
        source: SOURCE,
        lastSyncAt: new Date(),
        datasetVersion: CARDATA_DATASET_VERSION,
      },
      update: {
        lastSyncAt: new Date(),
        datasetVersion: CARDATA_DATASET_VERSION,
      },
    });

    await prisma.catalogImportRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        recordsProcessed: stats.rowsProcessed,
        recordsCreated: stats.modelYears,
        metadata: { ...stats, dedup },
      },
    });

    return stats;
  } catch (error) {
    await prisma.catalogImportRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

function isValidCardataRow(row: CardataRow, expectedMake: string): boolean {
  const rowMake = row.make?.trim();
  if (
    rowMake &&
    rowMake.toUpperCase() !== expectedMake.toUpperCase() &&
    normalizeMakeToken(rowMake) !== normalizeMakeToken(expectedMake)
  ) {
    return false;
  }
  if (!isValidCardataModel(row.model)) return false;
  if (!parseCardataYear(row.yearFrom)) return false;
  if (!row.variant?.trim()) return false;
  return true;
}

function normalizeMakeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function clearManufacturerBySlug(
  prisma: PrismaClient,
  slug: string,
): Promise<void> {
  const existing = await prisma.catalogManufacturer.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) {
    await prisma.catalogManufacturer.delete({ where: { id: existing.id } });
  }
}

async function flushModelYears(
  prisma: PrismaClient,
  rows: Prisma.CatalogModelYearCreateManyInput[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const unique = new Map<string, Prisma.CatalogModelYearCreateManyInput>();
  for (const row of rows) {
    unique.set(`${row.variantId}:${row.engineId}:${row.year}`, row);
  }
  const deduped = [...unique.values()];

  let inserted = 0;
  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);
    const result = await prisma.catalogModelYear.createMany({ data: batch });
    inserted += result.count;
  }
  return inserted;
}

async function upsertManufacturer(
  prisma: PrismaClient,
  slug: CardataMakeSlug,
  name: string,
): Promise<string> {
  const existing = await prisma.catalogManufacturer.findUnique({ where: { slug } });

  if (existing) {
    return prisma.catalogManufacturer
      .update({
        where: { id: existing.id },
        data: { name, source: SOURCE, externalId: slug },
      })
      .then((row) => row.id);
  }

  return prisma.catalogManufacturer
    .create({
      data: {
        name,
        slug,
        externalId: slug,
        source: SOURCE,
      },
    })
    .then((row) => row.id);
}

async function upsertSeries(
  prisma: PrismaClient,
  manufacturerId: string,
  name: string,
): Promise<string> {
  const slug = slugify(name);
  const existing = await prisma.catalogSeries.findFirst({
    where: { manufacturerId, slug },
  });

  if (existing) {
    return prisma.catalogSeries
      .update({
        where: { id: existing.id },
        data: { name },
      })
      .then((row) => row.id);
  }

  return prisma.catalogSeries
    .create({
      data: {
        manufacturerId,
        name,
        slug,
        externalId: slug,
      },
    })
    .then((row) => row.id);
}

async function upsertGeneration(
  prisma: PrismaClient,
  seriesId: string,
  name: string,
  yearFrom: number,
  yearTo: number | null,
): Promise<string> {
  const existing = await prisma.catalogGeneration.findFirst({
    where: { seriesId, yearFrom, yearTo },
  });
  if (existing) return existing.id;

  return prisma.catalogGeneration
    .create({
      data: {
        seriesId,
        name,
        yearFrom,
        yearTo,
        source: SOURCE,
      },
    })
    .then((row) => row.id);
}

async function upsertVariant(
  prisma: PrismaClient,
  generationId: string,
  data: {
    name: string;
    bodyType: BodyType | null;
    driveType: DriveType | null;
    doors: number | null;
    seats: number | null;
    externalId: string;
  },
): Promise<string> {
  const existing = await prisma.catalogVariant.findFirst({
    where: { generationId, name: data.name },
    select: { id: true, bodyType: true, driveType: true, doors: true, seats: true },
  });

  if (existing) {
    const updates: Prisma.CatalogVariantUpdateInput = {};
    if (existing.bodyType == null && data.bodyType != null) updates.bodyType = data.bodyType;
    if (existing.driveType == null && data.driveType != null) updates.driveType = data.driveType;
    if (existing.doors == null && data.doors != null) updates.doors = data.doors;
    if (existing.seats == null && data.seats != null) updates.seats = data.seats;
    if (Object.keys(updates).length > 0) {
      await prisma.catalogVariant.update({ where: { id: existing.id }, data: updates });
    }
    return existing.id;
  }

  return prisma.catalogVariant
    .create({
      data: {
        generationId,
        name: data.name,
        bodyType: data.bodyType,
        driveType: data.driveType,
        doors: data.doors,
        seats: data.seats,
        externalId: data.externalId,
        source: SOURCE,
      },
    })
    .then((row) => row.id);
}

async function upsertEngine(
  prisma: PrismaClient,
  variantId: string,
  data: {
    name: string;
    code: string | null;
    displacementCc: number | null;
    fuelType: FuelType | null;
    powerKw: number | null;
    powerPs: number | null;
    torqueNm: number | null;
    cylinders: number | null;
    valves: number | null;
    aspiration: string | null;
    transmissionTypes: string[] | null;
    externalId: string;
  },
): Promise<string> {
  const existing = await prisma.catalogEngine.findFirst({
    where: { variantId, name: data.name },
    select: {
      id: true, code: true, displacementCc: true, fuelType: true,
      powerKw: true, powerPs: true, torqueNm: true,
      cylinders: true, valves: true, aspiration: true,
    },
  });

  if (existing) {
    const updates: Prisma.CatalogEngineUpdateInput = {};
    if (existing.code == null && data.code != null) updates.code = data.code;
    if (existing.displacementCc == null && data.displacementCc != null) updates.displacementCc = data.displacementCc;
    if (existing.fuelType == null && data.fuelType != null) updates.fuelType = data.fuelType;
    if (existing.powerKw == null && data.powerKw != null) updates.powerKw = data.powerKw;
    if (existing.powerPs == null && data.powerPs != null) updates.powerPs = data.powerPs;
    if (existing.torqueNm == null && data.torqueNm != null) updates.torqueNm = data.torqueNm;
    if (existing.cylinders == null && data.cylinders != null) updates.cylinders = data.cylinders;
    if (existing.valves == null && data.valves != null) updates.valves = data.valves;
    if (existing.aspiration == null && data.aspiration != null) updates.aspiration = data.aspiration;
    if (Object.keys(updates).length > 0) {
      await prisma.catalogEngine.update({ where: { id: existing.id }, data: updates });
    }
    return existing.id;
  }

  return prisma.catalogEngine
    .create({
      data: {
        variantId,
        name: data.name,
        code: data.code,
        displacementCc: data.displacementCc,
        fuelType: data.fuelType,
        powerKw: data.powerKw,
        powerPs: data.powerPs,
        torqueNm: data.torqueNm,
        cylinders: data.cylinders,
        valves: data.valves,
        aspiration: data.aspiration,
        transmissionTypes: data.transmissionTypes ?? undefined,
        externalId: data.externalId,
        source: SOURCE,
      },
    })
    .then((row) => row.id);
}

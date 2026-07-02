import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  CatalogDataSource,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import type {
  BundledEngineConfig,
  BundledManufacturer,
  BundledModel,
} from "@/lib/catalog/bundled-types";
import { slugify } from "@/lib/catalog/slug";
import {
  formatGenerationName,
  groupYearsIntoGenerations,
} from "@/lib/catalog/year-ranges";

const SOURCE: CatalogDataSource = "OPEN_VEHICLE_DB";
const MODEL_YEAR_BATCH_SIZE = 1000;
export const BUNDLED_CATALOG_DATASET_VERSION = "bundled-catalog.merged-2026-07";

function catalogJsonPath(): string {
  return path.join(process.cwd(), "prisma", "seed", "catalog.generated.json");
}

export function loadBundledCatalog(): BundledManufacturer[] {
  const raw = readFileSync(catalogJsonPath(), "utf-8");
  const catalog = JSON.parse(raw) as BundledManufacturer[];
  const bySlug = new Map<string, BundledManufacturer>();
  for (const entry of catalog) {
    if (!bySlug.has(entry.slug)) bySlug.set(entry.slug, entry);
  }
  return Array.from(bySlug.values());
}

export function estimateBundledModelYears(catalog: BundledManufacturer[]): number {
  const currentYear = new Date().getFullYear();
  let total = 0;
  for (const entry of catalog) {
    for (const model of entry.models) {
      const configs = model.configs ?? [];
      if (configs.length > 0) {
        for (const config of configs) {
          total += configProductionYears(config, model, currentYear).length;
        }
        continue;
      }
      total += modelProductionYears(model, currentYear).length;
    }
  }
  return total;
}

function modelProductionYears(model: BundledModel, currentYear: number): number[] {
  if (model.years?.length) {
    return cleanYears(model.years);
  }
  const yearFrom = model.yearFrom ?? 1990;
  const yearTo = model.yearTo ?? currentYear;
  return yearsFromRange(yearFrom, yearTo);
}

function configProductionYears(
  config: BundledEngineConfig,
  model: BundledModel,
  currentYear: number,
): number[] {
  if (config.years?.length) return cleanYears(config.years);
  if (config.yearFrom != null || config.yearTo != null) {
    return yearsFromRange(
      config.yearFrom ?? model.yearFrom ?? 1990,
      config.yearTo ?? config.yearFrom ?? model.yearTo ?? currentYear,
    );
  }
  return modelProductionYears(model, currentYear);
}

function yearsFromRange(from: number, to: number): number[] {
  const start = Math.max(1886, Math.min(from, to));
  const end = Math.min(new Date().getFullYear() + 1, Math.max(from, to));
  const years: number[] = [];
  for (let year = start; year <= end; year++) {
    years.push(year);
  }
  return years;
}

function cleanYears(years: number[]): number[] {
  const maxYear = new Date().getFullYear() + 1;
  return [...new Set(years)]
    .filter((year) => Number.isInteger(year) && year >= 1886 && year <= maxYear)
    .sort((a, b) => a - b);
}

async function flushModelYearBatch(
  prisma: PrismaClient,
  batch: Array<{
    variantId: string;
    engineId: string;
    year: number;
    source: CatalogDataSource;
  }>,
) {
  if (batch.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    await prisma.$transaction(
      chunk.map((row) =>
        prisma.catalogModelYear.upsert({
          where: {
            variantId_engineId_year: {
              variantId: row.variantId,
              engineId: row.engineId,
              year: row.year,
            },
          },
          create: row,
          update: {},
        }),
      ),
    );
  }
  batch.length = 0;
}

async function upsertGeneration(
  prisma: PrismaClient,
  seriesId: string,
  yearFrom: number,
  yearTo: number,
): Promise<string> {
  const existing = await prisma.catalogGeneration.findFirst({
    where: { seriesId, yearFrom, yearTo },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.catalogGeneration.create({
    data: {
      seriesId,
      name: formatGenerationName({ from: yearFrom, to: yearTo }),
      yearFrom,
      yearTo,
      source: SOURCE,
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertVariant(
  prisma: PrismaClient,
  generationId: string,
  config: BundledEngineConfig,
): Promise<string> {
  const name = config.variantName?.trim() || "Standard";
  const existing = await prisma.catalogVariant.findFirst({
    where: { generationId, name },
    select: { id: true, bodyType: true, driveType: true, doors: true, seats: true },
  });

  if (existing) {
    const updates: Prisma.CatalogVariantUpdateInput = {};
    if (existing.bodyType == null && config.bodyType != null) updates.bodyType = config.bodyType;
    if (existing.driveType == null && config.driveType != null) updates.driveType = config.driveType;
    if (existing.doors == null && config.doors != null) updates.doors = config.doors;
    if (existing.seats == null && config.seats != null) updates.seats = config.seats;
    if (Object.keys(updates).length > 0) {
      await prisma.catalogVariant.update({ where: { id: existing.id }, data: updates });
    }
    return existing.id;
  }

  const created = await prisma.catalogVariant.create({
    data: {
      generationId,
      name,
      bodyType: config.bodyType ?? null,
      driveType: config.driveType ?? null,
      doors: config.doors ?? null,
      seats: config.seats ?? null,
      source: SOURCE,
      externalId: slugify(name).slice(0, 120),
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertEngine(
  prisma: PrismaClient,
  variantId: string,
  config: BundledEngineConfig,
): Promise<string> {
  const name = config.engineName?.trim() || "Base";
  const existing = await prisma.catalogEngine.findFirst({
    where: { variantId, name },
    select: {
      id: true,
      code: true,
      displacementCc: true,
      fuelType: true,
      powerKw: true,
      powerPs: true,
      torqueNm: true,
      cylinders: true,
      valves: true,
      aspiration: true,
      transmissionTypes: true,
      metadata: true,
    },
  });

  if (existing) {
    const updates: Prisma.CatalogEngineUpdateInput = {};
    if (existing.code == null && config.engineCode != null) updates.code = config.engineCode;
    if (existing.displacementCc == null && config.displacementCc != null) updates.displacementCc = config.displacementCc;
    if (existing.fuelType == null && config.fuelType != null) updates.fuelType = config.fuelType;
    if (existing.powerKw == null && config.powerKw != null) updates.powerKw = config.powerKw;
    if (existing.powerPs == null && config.powerPs != null) updates.powerPs = config.powerPs;
    if (existing.torqueNm == null && config.torqueNm != null) updates.torqueNm = config.torqueNm;
    if (existing.cylinders == null && config.cylinders != null) updates.cylinders = config.cylinders;
    if (existing.valves == null && config.valves != null) updates.valves = config.valves;
    if (existing.aspiration == null && config.aspiration != null) updates.aspiration = config.aspiration;
    if (existing.transmissionTypes == null && config.transmissionTypes != null) {
      updates.transmissionTypes = config.transmissionTypes;
    }
    if (existing.metadata == null && config.metadata != null) {
      updates.metadata = config.metadata as Prisma.InputJsonValue;
    }
    if (Object.keys(updates).length > 0) {
      await prisma.catalogEngine.update({ where: { id: existing.id }, data: updates });
    }
    return existing.id;
  }

  const created = await prisma.catalogEngine.create({
    data: {
      variantId,
      name,
      code: config.engineCode ?? null,
      displacementCc: config.displacementCc ?? null,
      fuelType: config.fuelType ?? null,
      powerKw: config.powerKw ?? null,
      powerPs: config.powerPs ?? null,
      torqueNm: config.torqueNm ?? null,
      cylinders: config.cylinders ?? null,
      valves: config.valves ?? null,
      aspiration: config.aspiration ?? null,
      transmissionTypes: config.transmissionTypes ?? undefined,
      metadata: config.metadata == null ? undefined : (config.metadata as Prisma.InputJsonValue),
      source: SOURCE,
      externalId: slugify(name).slice(0, 120),
    },
    select: { id: true },
  });
  return created.id;
}

export async function importBundledCatalog(
  prisma: PrismaClient,
  onProgress?: (message: string) => void,
): Promise<{ manufacturers: number; modelYears: number }> {
  const log = onProgress ?? (() => {});
  const catalog = loadBundledCatalog();
  const currentYear = new Date().getFullYear();
  const estimatedYears = estimateBundledModelYears(catalog);
  let modelYears = 0;

  const modelYearBatch: Array<{
    variantId: string;
    engineId: string;
    year: number;
    source: CatalogDataSource;
  }> = [];

  log(
    `[catalog] Seeding ${catalog.length} manufacturers (~${estimatedYears.toLocaleString()} model years)...`,
  );
  const startedAt = Date.now();

  for (let mIndex = 0; mIndex < catalog.length; mIndex++) {
    const entry = catalog[mIndex];

    const manufacturer = await prisma.catalogManufacturer.upsert({
      where: { slug: entry.slug },
      create: {
        slug: entry.slug,
        name: entry.name,
        country: entry.country || null,
        source: SOURCE,
      },
      update: {
        name: entry.name,
        country: entry.country || null,
      },
    });

    for (const model of entry.models) {
      const seriesSlug = slugify(model.name) || "model";
      const series = await prisma.catalogSeries.upsert({
        where: {
          manufacturerId_slug: {
            manufacturerId: manufacturer.id,
            slug: seriesSlug,
          },
        },
        create: {
          manufacturerId: manufacturer.id,
          name: model.name,
          slug: seriesSlug,
        },
        update: { name: model.name },
      });

      const configs = model.configs ?? [];
      const baseYears = modelProductionYears(model, currentYear);
      if (configs.length === 0) {
        for (const range of groupYearsIntoGenerations(baseYears)) {
          const generationId = await upsertGeneration(prisma, series.id, range.from, range.to);
          const variantId = await upsertVariant(prisma, generationId, { variantName: "Standard" });
          const engineId = await upsertEngine(prisma, variantId, { engineName: "Base" });

          for (const year of baseYears) {
            if (year < range.from || year > range.to) continue;
            modelYearBatch.push({ variantId, engineId, year, source: SOURCE });
            modelYears++;
            if (modelYearBatch.length >= MODEL_YEAR_BATCH_SIZE) {
              await flushModelYearBatch(prisma, modelYearBatch);
            }
          }
        }
        continue;
      }

      for (const config of configs) {
        const years = configProductionYears(config, model, currentYear);
        for (const range of groupYearsIntoGenerations(years)) {
          const generationId = await upsertGeneration(prisma, series.id, range.from, range.to);
          const variantId = await upsertVariant(prisma, generationId, config);
          const engineId = await upsertEngine(prisma, variantId, config);

          for (const year of years) {
            if (year < range.from || year > range.to) continue;
            modelYearBatch.push({ variantId, engineId, year, source: SOURCE });
            modelYears++;
            if (modelYearBatch.length >= MODEL_YEAR_BATCH_SIZE) {
              await flushModelYearBatch(prisma, modelYearBatch);
            }
          }
        }
      }
    }

    log(
      `[catalog] ${mIndex + 1}/${catalog.length} ${entry.name} - ${modelYears.toLocaleString()} model years (${Math.round((Date.now() - startedAt) / 1000)}s)`,
    );
  }

  await flushModelYearBatch(prisma, modelYearBatch);

  await prisma.catalogSyncState.upsert({
    where: { source: SOURCE },
    create: {
      source: SOURCE,
      lastSyncAt: new Date(),
      datasetVersion: BUNDLED_CATALOG_DATASET_VERSION,
    },
    update: {
      lastSyncAt: new Date(),
      datasetVersion: BUNDLED_CATALOG_DATASET_VERSION,
    },
  });

  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  log(
    `[catalog] Done: ${catalog.length} manufacturers, ${modelYears.toLocaleString()} model years in ${elapsedSec}s`,
  );
  return { manufacturers: catalog.length, modelYears };
}

export async function ensureBundledCatalogSeeded(
  prisma: PrismaClient,
  onProgress?: (message: string) => void,
): Promise<boolean> {
  const state = await prisma.catalogSyncState.findUnique({
    where: { source: SOURCE },
    select: { datasetVersion: true },
  });

  if (state?.datasetVersion === BUNDLED_CATALOG_DATASET_VERSION) {
    const existing = await prisma.catalogModelYear.count();
    onProgress?.(`[catalog] Already seeded (${existing.toLocaleString()} model years) - skipping`);
    return false;
  }

  await importBundledCatalog(prisma, onProgress);
  return true;
}

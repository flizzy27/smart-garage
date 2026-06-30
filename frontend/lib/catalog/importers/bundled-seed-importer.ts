import { readFileSync } from "node:fs";
import path from "node:path";
import type { CatalogDataSource, PrismaClient } from "@prisma/client";
import {
  formatGenerationName,
  groupYearsIntoGenerations,
} from "@/lib/catalog/year-ranges";

const SOURCE: CatalogDataSource = "OPEN_VEHICLE_DB";
const MODEL_YEAR_BATCH_SIZE = 1000;
export const BUNDLED_CATALOG_DATASET_VERSION = "bundled-catalog.ovd-2026-06";

type BundledModel = {
  name: string;
  yearFrom?: number;
  yearTo?: number;
  years?: number[];
};

type BundledManufacturer = {
  slug: string;
  name: string;
  country: string;
  models: BundledModel[];
};

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
      if (model.years?.length) {
        total += model.years.length;
        continue;
      }
      const yearFrom = model.yearFrom ?? 1990;
      const yearTo = model.yearTo ?? currentYear;
      total += Math.max(0, yearTo - yearFrom + 1);
    }
  }
  return total;
}

function modelProductionYears(model: BundledModel, currentYear: number): number[] {
  if (model.years?.length) {
    return [...new Set(model.years)].sort((a, b) => a - b);
  }
  const yearFrom = model.yearFrom ?? 1990;
  const yearTo = model.yearTo ?? currentYear;
  const years: number[] = [];
  for (let year = yearFrom; year <= yearTo; year++) {
    years.push(year);
  }
  return years;
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

export async function importBundledCatalog(
  prisma: PrismaClient,
  onProgress?: (message: string) => void,
): Promise<{ manufacturers: number; modelYears: number }> {
  const log = onProgress ?? (() => {});
  const catalog = loadBundledCatalog();
  const currentYear = new Date().getFullYear();
  const estimatedYears = estimateBundledModelYears(catalog);
  let modelYears = 0;

  const variantEngineByGeneration = new Map<
    string,
    { variantId: string; engineId: string }
  >();
  const generationBySeriesYears = new Map<string, string>();

  const modelYearBatch: Array<{
    variantId: string;
    engineId: string;
    year: number;
    source: CatalogDataSource;
  }> = [];

  log(
    `[catalog] Seeding ${catalog.length} manufacturers (~${estimatedYears.toLocaleString()} model years)…`,
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

      const productionYears = modelProductionYears(model, currentYear);
      if (productionYears.length === 0) continue;

      const yearRanges = groupYearsIntoGenerations(productionYears);

      for (const range of yearRanges) {
        const generationKey = `${series.id}:${range.from}:${range.to}`;

        let generationId = generationBySeriesYears.get(generationKey);
        if (!generationId) {
          const generationName = formatGenerationName(range);
          let generation = await prisma.catalogGeneration.findFirst({
            where: { seriesId: series.id, yearFrom: range.from, yearTo: range.to },
            select: { id: true },
          });
          if (!generation) {
            generation = await prisma.catalogGeneration.create({
              data: {
                seriesId: series.id,
                name: generationName,
                yearFrom: range.from,
                yearTo: range.to,
                source: SOURCE,
              },
              select: { id: true },
            });
          }
          generationId = generation.id;
          generationBySeriesYears.set(generationKey, generationId);
        }

        let variantEngine = variantEngineByGeneration.get(generationId);
        if (!variantEngine) {
          let variant = await prisma.catalogVariant.findFirst({
            where: { generationId, name: "Standard" },
            select: { id: true },
          });
          if (!variant) {
            variant = await prisma.catalogVariant.create({
              data: { generationId, name: "Standard", source: SOURCE },
              select: { id: true },
            });
          }

          let engine = await prisma.catalogEngine.findFirst({
            where: { variantId: variant.id, name: "Base" },
            select: { id: true },
          });
          if (!engine) {
            engine = await prisma.catalogEngine.create({
              data: { variantId: variant.id, name: "Base", source: SOURCE },
              select: { id: true },
            });
          }

          variantEngine = { variantId: variant.id, engineId: engine.id };
          variantEngineByGeneration.set(generationId, variantEngine);
        }

        for (const year of productionYears) {
          if (year < range.from || year > range.to) continue;

          modelYearBatch.push({
            variantId: variantEngine.variantId,
            engineId: variantEngine.engineId,
            year,
            source: SOURCE,
          });
          modelYears++;

          if (modelYearBatch.length >= MODEL_YEAR_BATCH_SIZE) {
            await flushModelYearBatch(prisma, modelYearBatch);
          }
        }
      }
    }

    log(
      `[catalog] ${mIndex + 1}/${catalog.length} ${entry.name} — ${modelYears.toLocaleString()} model years (${Math.round((Date.now() - startedAt) / 1000)}s)`,
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
  const existing = await prisma.catalogModelYear.count();
  if (existing > 0) {
    onProgress?.(`[catalog] Already seeded (${existing.toLocaleString()} model years) — skipping`);
    return false;
  }
  await importBundledCatalog(prisma, onProgress);
  return true;
}

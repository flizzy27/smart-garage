import type {
  BodyType,
  CatalogDataSource,
  DriveType,
  FuelType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import {
  parseBodyType,
  parseDisplacementCc,
  parseDriveType,
  parseEngineName,
  parseFuelType,
  parseVariantName,
} from "@/lib/catalog/parse-style";
import { slugify, uniqueSlug } from "@/lib/catalog/slug";
import {
  fetchMakeStyles,
  fetchMakesAndModels,
  OVD_DATASET_VERSION,
  type OvdMakeEntry,
  type OvdMakeStyles,
} from "@/lib/catalog/sources/open-vehicle-db";
import {
  formatGenerationName,
  groupYearsIntoGenerations,
} from "@/lib/catalog/year-ranges";

export type ImportOptions = {
  quick?: boolean;
  makeSlugs?: string[];
  onProgress?: (message: string) => void;
};

export type ImportStats = {
  manufacturers: number;
  series: number;
  generations: number;
  variants: number;
  engines: number;
  modelYears: number;
};

type GenerationCache = Map<string, string>;
type VariantCache = Map<string, string>;
type EngineCache = Map<string, string>;

const BATCH_SIZE = 500;

export async function importOpenVehicleDb(
  prisma: PrismaClient,
  options: ImportOptions = {},
): Promise<ImportStats> {
  const log = options.onProgress ?? (() => {});
  const stats: ImportStats = {
    manufacturers: 0,
    series: 0,
    generations: 0,
    variants: 0,
    engines: 0,
    modelYears: 0,
  };

  const run = await prisma.catalogImportRun.create({
    data: {
      source: "OPEN_VEHICLE_DB",
      status: "RUNNING",
      metadata: { quick: options.quick ?? false },
    },
  });

  try {
    log("Fetching open-vehicle-db makes and models…");
    const makes = await fetchMakesAndModels();
    const filtered = options.makeSlugs?.length
      ? makes.filter((m) => options.makeSlugs!.includes(m.make_slug))
      : makes;

    for (const make of filtered) {
      log(`Importing ${make.make_name}…`);
      const manufacturerId = await upsertManufacturer(prisma, make);
      stats.manufacturers++;

      let stylesByModel: OvdMakeStyles | null = null;
      if (!options.quick) {
        try {
          stylesByModel = await fetchMakeStyles(make.make_slug);
        } catch {
          log(`  Styles unavailable for ${make.make_slug}, using model years only`);
        }
      }

      for (const model of Object.values(make.models)) {
        const seriesId = await upsertSeries(prisma, manufacturerId, model);
        stats.series++;

        const generationCache: GenerationCache = new Map();
        const yearRanges = groupYearsIntoGenerations(model.years);

        for (const range of yearRanges) {
          const genKey = `${seriesId}:${range.from}-${range.to}`;
          let generationId = generationCache.get(genKey);
          if (!generationId) {
            generationId = await upsertGeneration(
              prisma,
              seriesId,
              formatGenerationName(range),
              range.from,
              range.to,
            );
            generationCache.set(genKey, generationId);
            stats.generations++;
          }

          const modelStyles = stylesByModel?.[model.model_name];
          if (modelStyles && Object.keys(modelStyles).length > 0) {
            const variantCache: VariantCache = new Map();
            const engineCache: EngineCache = new Map();
            const modelYearRows: Prisma.CatalogModelYearCreateManyInput[] = [];

            for (const [styleName, style] of Object.entries(modelStyles)) {
              const styleYears = style.years.filter(
                (y) => y >= range.from && y <= range.to,
              );
              if (styleYears.length === 0) continue;

              const variantLabel = parseVariantName(styleName, model.model_name);
              const variantKey = `${generationId}:${variantLabel}`;
              let variantId = variantCache.get(variantKey);
              if (!variantId) {
                variantId = await upsertVariant(prisma, generationId, {
                  name: variantLabel,
                  bodyType: parseBodyType(styleName),
                  driveType: parseDriveType(styleName),
                  externalId: slugify(styleName).slice(0, 120),
                });
                variantCache.set(variantKey, variantId);
                stats.variants++;
              }

              const engineLabel = parseEngineName(styleName, model.model_name);
              const engineKey = `${variantId}:${engineLabel}`;
              let engineId = engineCache.get(engineKey);
              if (!engineId) {
                engineId = await upsertEngine(prisma, variantId, {
                  name: engineLabel,
                  displacementCc: parseDisplacementCc(styleName),
                  fuelType: parseFuelType(styleName),
                  externalId: slugify(`${variantLabel}-${engineLabel}`).slice(
                    0,
                    120,
                  ),
                });
                engineCache.set(engineKey, engineId);
                stats.engines++;
              }

              for (const year of styleYears) {
                modelYearRows.push({
                  variantId,
                  engineId,
                  year,
                  source: "OPEN_VEHICLE_DB",
                });
              }
            }

            stats.modelYears += await flushModelYears(prisma, modelYearRows);
          } else {
            const { variantId, engineId, createdVariant, createdEngine } =
              await ensureBaseVariantEngine(prisma, generationId);
            if (createdVariant) stats.variants++;
            if (createdEngine) stats.engines++;

            const modelYearRows = model.years
              .filter((y) => y >= range.from && y <= range.to)
              .map((year) => ({
                variantId,
                engineId,
                year,
                source: "OPEN_VEHICLE_DB" as CatalogDataSource,
              }));

            stats.modelYears += await flushModelYears(prisma, modelYearRows);
          }
        }
      }
    }

    await prisma.catalogSyncState.upsert({
      where: { source: "OPEN_VEHICLE_DB" },
      create: {
        source: "OPEN_VEHICLE_DB",
        lastSyncAt: new Date(),
        datasetVersion: OVD_DATASET_VERSION,
      },
      update: {
        lastSyncAt: new Date(),
        datasetVersion: OVD_DATASET_VERSION,
      },
    });

    await prisma.catalogImportRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        recordsProcessed:
          stats.manufacturers +
          stats.series +
          stats.generations +
          stats.variants +
          stats.engines +
          stats.modelYears,
        recordsCreated: stats.modelYears,
        metadata: stats,
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
    for (const row of batch) {
      const existing = await prisma.catalogModelYear.findFirst({
        where: {
          variantId: row.variantId,
          engineId: row.engineId,
          year: row.year,
        },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.catalogModelYear.create({ data: row });
      inserted++;
    }
  }
  return inserted;
}

async function upsertManufacturer(
  prisma: PrismaClient,
  make: OvdMakeEntry,
): Promise<string> {
  const slug = make.make_slug || slugify(make.make_name);
  const existing = await prisma.catalogManufacturer.findFirst({
    where: {
      OR: [
        { source: "OPEN_VEHICLE_DB", externalId: String(make.make_id) },
        { slug },
      ],
    },
  });

  if (existing) {
    return prisma.catalogManufacturer
      .update({
        where: { id: existing.id },
        data: {
          name: make.make_name,
          slug,
          externalId: String(make.make_id),
          source: "OPEN_VEHICLE_DB",
        },
      })
      .then((row) => row.id);
  }

  return prisma.catalogManufacturer
    .create({
      data: {
        name: make.make_name,
        slug,
        externalId: String(make.make_id),
        source: "OPEN_VEHICLE_DB",
      },
    })
    .then((row) => row.id);
}

async function upsertSeries(
  prisma: PrismaClient,
  manufacturerId: string,
  model: OvdMakeEntry["models"][string],
): Promise<string> {
  const slug = slugify(model.model_name);
  const existing = await prisma.catalogSeries.findFirst({
    where: {
      manufacturerId,
      OR: [
        { externalId: String(model.model_id) },
        { slug },
      ],
    },
  });

  if (existing) {
    return prisma.catalogSeries
      .update({
        where: { id: existing.id },
        data: {
          name: model.model_name,
          slug,
          externalId: String(model.model_id),
        },
      })
      .then((row) => row.id);
  }

  return prisma.catalogSeries
    .create({
      data: {
        manufacturerId,
        name: model.model_name,
        slug,
        externalId: String(model.model_id),
      },
    })
    .then((row) => row.id);
}

async function upsertGeneration(
  prisma: PrismaClient,
  seriesId: string,
  name: string,
  yearFrom: number,
  yearTo: number,
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
        source: "OPEN_VEHICLE_DB",
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
    externalId: string;
  },
): Promise<string> {
  const existing = await prisma.catalogVariant.findFirst({
    where: {
      generationId,
      name: data.name,
    },
  });
  if (existing) return existing.id;

  return prisma.catalogVariant
    .create({
      data: {
        generationId,
        name: data.name,
        bodyType: data.bodyType,
        driveType: data.driveType,
        externalId: data.externalId,
        source: "OPEN_VEHICLE_DB",
      },
    })
    .then((row) => row.id);
}

async function upsertEngine(
  prisma: PrismaClient,
  variantId: string,
  data: {
    name: string;
    displacementCc: number | null;
    fuelType: FuelType | null;
    externalId: string;
  },
): Promise<string> {
  const existing = await prisma.catalogEngine.findFirst({
    where: { variantId, name: data.name },
  });
  if (existing) return existing.id;

  return prisma.catalogEngine
    .create({
      data: {
        variantId,
        name: data.name,
        displacementCc: data.displacementCc,
        fuelType: data.fuelType,
        externalId: data.externalId,
        source: "OPEN_VEHICLE_DB",
      },
    })
    .then((row) => row.id);
}

async function ensureBaseVariantEngine(
  prisma: PrismaClient,
  generationId: string,
): Promise<{
  variantId: string;
  engineId: string;
  createdVariant: boolean;
  createdEngine: boolean;
}> {
  let variant = await prisma.catalogVariant.findFirst({
    where: { generationId, name: "Standard" },
  });
  let createdVariant = false;
  if (!variant) {
    variant = await prisma.catalogVariant.create({
      data: {
        generationId,
        name: "Standard",
        source: "OPEN_VEHICLE_DB",
      },
    });
    createdVariant = true;
  }

  let engine = await prisma.catalogEngine.findFirst({
    where: { variantId: variant.id, name: "Base" },
  });
  let createdEngine = false;
  if (!engine) {
    engine = await prisma.catalogEngine.create({
      data: {
        variantId: variant.id,
        name: "Base",
        source: "OPEN_VEHICLE_DB",
      },
    });
    createdEngine = true;
  }

  return {
    variantId: variant.id,
    engineId: engine.id,
    createdVariant,
    createdEngine,
  };
}

export async function importNhtsaMakeIndex(
  prisma: PrismaClient,
  onProgress?: (message: string) => void,
): Promise<number> {
  const log = onProgress ?? (() => {});
  const { fetchCarMakesForVehicleType } = await import(
    "@/lib/catalog/sources/nhtsa-vpic"
  );

  log("Syncing NHTSA car make index…");
  const makes = await fetchCarMakesForVehicleType();
  let synced = 0;

  for (const make of makes) {
    const slug = slugify(make.makeName);
    const existing = await prisma.catalogManufacturer.findFirst({
      where: {
        OR: [
          { externalId: String(make.makeId), source: "NHTSA_VPIC" },
          { slug },
        ],
      },
    });

    if (existing) {
      await prisma.catalogManufacturer.update({
        where: { id: existing.id },
        data: {
          externalId: existing.externalId ?? String(make.makeId),
        },
      });
    } else {
      await prisma.catalogManufacturer.create({
        data: {
          name: make.makeName,
          slug: uniqueSlug(make.makeName, make.makeId),
          externalId: String(make.makeId),
          source: "NHTSA_VPIC",
        },
      });
    }
    synced++;
  }

  await prisma.catalogSyncState.upsert({
    where: { source: "NHTSA_VPIC" },
    create: {
      source: "NHTSA_VPIC",
      lastSyncAt: new Date(),
      datasetVersion: "nhtsa-vpic-car-makes",
    },
    update: {
      lastSyncAt: new Date(),
      datasetVersion: "nhtsa-vpic-car-makes",
    },
  });

  return synced;
}

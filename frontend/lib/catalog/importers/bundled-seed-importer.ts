import { readFileSync } from "node:fs";
import path from "node:path";
import type { CatalogDataSource, PrismaClient } from "@prisma/client";

const SOURCE: CatalogDataSource = "OPEN_VEHICLE_DB";

type BundledModel = {
  name: string;
  yearFrom?: number;
  yearTo?: number;
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

async function ensureBaseVariantEngine(prisma: PrismaClient, generationId: string) {
  let variant = await prisma.catalogVariant.findFirst({
    where: { generationId, name: "Standard" },
  });
  if (!variant) {
    variant = await prisma.catalogVariant.create({
      data: { generationId, name: "Standard", source: SOURCE },
    });
  }

  let engine = await prisma.catalogEngine.findFirst({
    where: { variantId: variant.id, name: "Base" },
  });
  if (!engine) {
    engine = await prisma.catalogEngine.create({
      data: { variantId: variant.id, name: "Base", source: SOURCE },
    });
  }

  return { variantId: variant.id, engineId: engine.id };
}

export async function importBundledCatalog(
  prisma: PrismaClient,
  onProgress?: (message: string) => void,
): Promise<{ manufacturers: number; modelYears: number }> {
  const log = onProgress ?? (() => {});
  const catalog = loadBundledCatalog();
  const currentYear = new Date().getFullYear();
  let modelYears = 0;

  log(`Seeding bundled catalog (${catalog.length} manufacturers)…`);

  for (const entry of catalog) {
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

      const yearFrom = model.yearFrom ?? 1990;
      const yearTo = model.yearTo ?? currentYear;
      const generationName = `${yearFrom}–${yearTo}`;

      let generation = await prisma.catalogGeneration.findFirst({
        where: { seriesId: series.id, yearFrom, yearTo },
      });
      if (!generation) {
        generation = await prisma.catalogGeneration.create({
          data: {
            seriesId: series.id,
            name: generationName,
            yearFrom,
            yearTo,
            source: SOURCE,
          },
        });
      }

      const { variantId, engineId } = await ensureBaseVariantEngine(
        prisma,
        generation.id,
      );

      for (let year = yearFrom; year <= yearTo; year++) {
        await prisma.catalogModelYear.upsert({
          where: {
            variantId_engineId_year: { variantId, engineId, year },
          },
          create: { variantId, engineId, year, source: SOURCE },
          update: {},
        });
        modelYears++;
      }
    }
  }

  await prisma.catalogSyncState.upsert({
    where: { source: SOURCE },
    create: {
      source: SOURCE,
      lastSyncAt: new Date(),
      datasetVersion: "bundled-catalog.generated.json",
    },
    update: {
      lastSyncAt: new Date(),
      datasetVersion: "bundled-catalog.generated.json",
    },
  });

  log(`Bundled catalog ready: ${catalog.length} manufacturers, ${modelYears} model years`);
  return { manufacturers: catalog.length, modelYears };
}

export async function ensureBundledCatalogSeeded(
  prisma: PrismaClient,
  onProgress?: (message: string) => void,
): Promise<boolean> {
  const existing = await prisma.catalogModelYear.count();
  if (existing > 0) return false;
  await importBundledCatalog(prisma, onProgress);
  return true;
}

/**
 * Seed vehicle catalog from bundled JSON on first container start (no network).
 * Run from /app after prisma migrate deploy.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const SOURCE = "OPEN_VEHICLE_DB";
const MODEL_YEAR_BATCH_SIZE = 1000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, "..", "prisma", "seed", "catalog.generated.json");

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function estimateModelYears(catalog, currentYear) {
  let total = 0;
  for (const entry of catalog) {
    for (const model of entry.models) {
      const yearFrom = model.yearFrom ?? 1990;
      const yearTo = model.yearTo ?? currentYear;
      total += Math.max(0, yearTo - yearFrom + 1);
    }
  }
  return total;
}

async function flushModelYearBatch(prisma, batch) {
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

async function main() {
  const prisma = new PrismaClient();
  const startedAt = Date.now();

  try {
    const existing = await prisma.catalogModelYear.count();
    if (existing > 0) {
      console.log(`[catalog] Already seeded (${existing.toLocaleString()} model years) — skipping`);
      return;
    }

    console.log("[catalog] Loading bundled catalog JSON…");
    const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
    const currentYear = new Date().getFullYear();
    const estimatedYears = estimateModelYears(catalog, currentYear);
    let modelYears = 0;

    const variantEngineByGeneration = new Map();
    const generationBySeriesYears = new Map();
    const modelYearBatch = [];

    console.log(
      `[catalog] Seeding ${catalog.length} manufacturers (~${estimatedYears.toLocaleString()} model years)…`,
    );

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
        update: { name: entry.name, country: entry.country || null },
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
        const generationKey = `${series.id}:${yearFrom}:${yearTo}`;

        let generationId = generationBySeriesYears.get(generationKey);
        if (!generationId) {
          let generation = await prisma.catalogGeneration.findFirst({
            where: { seriesId: series.id, yearFrom, yearTo },
            select: { id: true },
          });
          if (!generation) {
            generation = await prisma.catalogGeneration.create({
              data: {
                seriesId: series.id,
                name: `${yearFrom}–${yearTo}`,
                yearFrom,
                yearTo,
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

        for (let year = yearFrom; year <= yearTo; year++) {
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

      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      console.log(
        `[catalog] ${mIndex + 1}/${catalog.length} ${entry.name} — ${modelYears.toLocaleString()} model years (${elapsedSec}s)`,
      );
    }

    await flushModelYearBatch(prisma, modelYearBatch);

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

    const totalSec = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `[catalog] Done: ${catalog.length} manufacturers, ${modelYears.toLocaleString()} model years in ${totalSec}s`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[catalog] Seed failed:", error);
  process.exit(1);
});

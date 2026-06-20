/**
 * Seed vehicle catalog from bundled JSON on first container start (no network).
 * Run from /app after prisma migrate deploy.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const SOURCE = "OPEN_VEHICLE_DB";
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

async function ensureBaseVariantEngine(prisma, generationId) {
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

async function main() {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.catalogModelYear.count();
    if (existing > 0) {
      console.log(`Catalog already has ${existing} model years — skipping seed`);
      return;
    }

    const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
    const currentYear = new Date().getFullYear();
    let modelYears = 0;

    console.log(`Seeding bundled catalog (${catalog.length} manufacturers)…`);

    for (const entry of catalog) {
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

        let generation = await prisma.catalogGeneration.findFirst({
          where: { seriesId: series.id, yearFrom, yearTo },
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

    console.log(
      `Catalog seed complete: ${catalog.length} manufacturers, ${modelYears} model years`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Catalog seed failed:", error);
  process.exit(1);
});

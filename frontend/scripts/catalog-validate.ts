#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_QUERIES = [
  { make: "volkswagen", series: "Golf GTI", year: 2015 },
  { make: "volkswagen", series: "Scirocco", year: 2012 },
  { make: "audi", series: "A4", year: 2018 },
  { make: "porsche", series: "911", year: 2019 },
  { make: "skoda", series: "Octavia", year: 2020 },
];

async function main() {
  console.log("Smart Garage — cardata catalog validation\n");

  const cardataMakes = await prisma.catalogManufacturer.findMany({
    where: { source: "CARDATA_WIKI" },
    orderBy: { name: "asc" },
    include: {
      series: {
        include: {
          generations: {
            include: {
              variants: {
                include: {
                  engines: { include: { modelYears: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (cardataMakes.length === 0) {
    console.log("No CARDATA_WIKI manufacturers found. Run catalog:import:cardata first.");
    process.exit(1);
  }

  console.log("=== Per-make summary ===\n");

  for (const make of cardataMakes) {
    const seriesCount = make.series.length;
    let generationCount = 0;
    let variantCount = 0;
    let engineCount = 0;
    let modelYearCount = 0;
    let enginesWithPower = 0;
    let enginesWithFuel = 0;
    let enginesWithDisplacement = 0;

    for (const series of make.series) {
      generationCount += series.generations.length;
      for (const gen of series.generations) {
        variantCount += gen.variants.length;
        for (const variant of gen.variants) {
          engineCount += variant.engines.length;
          for (const engine of variant.engines) {
            modelYearCount += engine.modelYears.length;
            if (engine.powerKw != null || engine.powerPs != null) enginesWithPower++;
            if (engine.fuelType) enginesWithFuel++;
            if (engine.displacementCc) enginesWithDisplacement++;
          }
        }
      }
    }

    const pct = (n: number) =>
      engineCount > 0 ? `${Math.round((n / engineCount) * 100)}%` : "n/a";

    console.log(`${make.name} (${make.slug})`);
    console.log(`  Series: ${seriesCount}, Generations: ${generationCount}`);
    console.log(`  Variants: ${variantCount}, Engines: ${engineCount}, Model years: ${modelYearCount}`);
    console.log(`  Power: ${pct(enginesWithPower)}, Fuel: ${pct(enginesWithFuel)}, Displacement: ${pct(enginesWithDisplacement)}`);
    console.log();
  }

  console.log("=== Sample lookups ===\n");

  for (const sample of SAMPLE_QUERIES) {
    const manufacturer = await prisma.catalogManufacturer.findUnique({
      where: { slug: sample.make },
    });
    if (!manufacturer) {
      console.log(`${sample.make} ${sample.series} ${sample.year}: manufacturer not found`);
      continue;
    }

    const hits = await prisma.catalogModelYear.findMany({
      where: {
        year: sample.year,
        source: "CARDATA_WIKI",
        variant: {
          generation: {
            series: {
              manufacturerId: manufacturer.id,
              name: { contains: sample.series },
            },
          },
        },
      },
      take: 3,
      include: {
        engine: true,
        variant: {
          include: {
            generation: { include: { series: true } },
          },
        },
      },
    });

    if (hits.length === 0) {
      console.log(`${sample.make} ${sample.series} ${sample.year}: no matches`);
      continue;
    }

    for (const hit of hits) {
      const e = hit.engine;
      console.log(
        `${manufacturer.name} / ${hit.variant.generation.series.name} / ${hit.year}`,
      );
      console.log(`  Engine: ${e.name}`);
      console.log(
        `  ${e.powerPs ?? "?"} PS / ${e.powerKw ?? "?"} kW, ${e.fuelType ?? "?"}, ${e.displacementCc ?? "?"} cc`,
      );
    }
    console.log();
  }

  const sync = await prisma.catalogSyncState.findUnique({
    where: { source: "CARDATA_WIKI" },
  });
  if (sync) {
    console.log("=== Sync state ===");
    console.log(`  Last sync: ${sync.lastSyncAt?.toISOString() ?? "never"}`);
    console.log(`  Dataset: ${sync.datasetVersion ?? "unknown"}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

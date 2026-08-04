/**
 * Seed/update the bundled vehicle catalog from offline JSON on container start.
 * Runs after prisma migrate deploy and must not require TypeScript tooling.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const SOURCE = "OPEN_VEHICLE_DB";
const MODEL_YEAR_BATCH_SIZE = 1000;
// Keep in sync with frontend/lib/catalog/importers/bundled-seed-importer.ts.
const BUNDLED_CATALOG_DATASET_VERSION = "bundled-catalog.merged-2026-08";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const containerCatalogPath = path.join(__dirname, "..", "prisma", "seed", "catalog.generated.json");
const repoCatalogPath = path.join(__dirname, "..", "frontend", "prisma", "seed", "catalog.generated.json");
const cwdCatalogPath = path.join(process.cwd(), "prisma", "seed", "catalog.generated.json");
const catalogPath = existsSync(containerCatalogPath)
  ? containerCatalogPath
  : existsSync(repoCatalogPath)
    ? repoCatalogPath
    : cwdCatalogPath;

/**
 * A top-up import now runs *alongside* the app, so both processes write to the
 * same SQLite file. Without a busy timeout the second writer fails immediately
 * with "database is locked" instead of waiting its turn, which would abort the
 * import and leave the catalog half-updated until the next restart.
 */
function databaseUrlWithBusyTimeout() {
  const raw = process.env.DATABASE_URL;
  if (!raw || !raw.startsWith("file:")) return raw;

  const [base, query = ""] = raw.split("?");
  const params = new URLSearchParams(query);
  if (!params.has("busy_timeout")) params.set("busy_timeout", "15000");
  if (!params.has("connection_limit")) params.set("connection_limit", "1");
  return `${base}?${params.toString()}`;
}

function createPrismaClient() {
  const url = databaseUrlWithBusyTimeout();
  return url
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

const LOCK_RETRY_DELAYS_MS = [250, 750, 2000, 5000];

function isLockError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    message.includes("database is locked") ||
    message.includes("sqlite_busy") ||
    message.includes("timed out")
  );
}

/** Retries a write that lost a race with the running app. */
async function withLockRetry(run) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!isLockError(error) || attempt >= LOCK_RETRY_DELAYS_MS.length) throw error;
      const delay = LOCK_RETRY_DELAYS_MS[attempt];
      console.warn(`[catalog] database busy, retrying in ${delay}ms…`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function yearsFromRange(from, to) {
  const start = Math.max(1886, Math.min(from, to));
  const end = Math.min(new Date().getFullYear() + 1, Math.max(from, to));
  const years = [];
  for (let year = start; year <= end; year++) years.push(year);
  return years;
}

function cleanYears(years) {
  const maxYear = new Date().getFullYear() + 1;
  return [...new Set(years)]
    .filter((year) => Number.isInteger(year) && year >= 1886 && year <= maxYear)
    .sort((a, b) => a - b);
}

function modelProductionYears(model) {
  if (model.years?.length) return cleanYears(model.years);
  return yearsFromRange(model.yearFrom ?? 1990, model.yearTo ?? new Date().getFullYear());
}

function configProductionYears(config, model) {
  if (config.years?.length) return cleanYears(config.years);
  if (config.yearFrom != null || config.yearTo != null) {
    return yearsFromRange(
      config.yearFrom ?? model.yearFrom ?? 1990,
      config.yearTo ?? config.yearFrom ?? model.yearTo ?? new Date().getFullYear(),
    );
  }
  return modelProductionYears(model);
}

function groupYearsIntoGenerations(years) {
  if (years.length === 0) return [];

  const sorted = [...new Set(years)].sort((a, b) => a - b);
  const ranges = [];
  let from = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const year = sorted[i];
    if (year - prev > 2) {
      ranges.push({ from, to: prev });
      from = year;
    }
    prev = year;
  }

  ranges.push({ from, to: prev });
  return ranges;
}

function formatGenerationName(range) {
  return range.from === range.to ? String(range.from) : `${range.from}-${range.to}`;
}

function estimateModelYears(catalog) {
  let total = 0;
  for (const entry of catalog) {
    for (const model of entry.models) {
      if (model.configs?.length) {
        const covered = new Set();
        for (const config of model.configs) {
          const years = configProductionYears(config, model);
          total += years.length;
          for (const year of years) covered.add(year);
        }
        if (model.years?.length || model.yearFrom != null || model.yearTo != null) {
          total += modelProductionYears(model).filter((year) => !covered.has(year)).length;
        }
      } else {
        total += modelProductionYears(model).length;
      }
    }
  }
  return total;
}

async function flushModelYearBatch(prisma, batch) {
  if (batch.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    await withLockRetry(() =>
      prisma.$transaction(
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
      ),
    );
  }
  batch.length = 0;
}

async function upsertGeneration(prisma, seriesId, range) {
  const existing = await prisma.catalogGeneration.findFirst({
    where: { seriesId, yearFrom: range.from, yearTo: range.to },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.catalogGeneration.create({
    data: {
      seriesId,
      name: formatGenerationName(range),
      yearFrom: range.from,
      yearTo: range.to,
      source: SOURCE,
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertVariant(prisma, generationId, config) {
  const name = config.variantName?.trim() || "Standard";
  const existing = await prisma.catalogVariant.findFirst({
    where: { generationId, name },
    select: { id: true, bodyType: true, driveType: true, doors: true, seats: true },
  });

  if (existing) {
    const data = {};
    if (existing.bodyType == null && config.bodyType != null) data.bodyType = config.bodyType;
    if (existing.driveType == null && config.driveType != null) data.driveType = config.driveType;
    if (existing.doors == null && config.doors != null) data.doors = config.doors;
    if (existing.seats == null && config.seats != null) data.seats = config.seats;
    if (Object.keys(data).length > 0) {
      await prisma.catalogVariant.update({ where: { id: existing.id }, data });
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
      externalId: slugify(name).slice(0, 120),
      source: SOURCE,
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertEngine(prisma, variantId, config) {
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
    const data = {};
    if (existing.code == null && config.engineCode != null) data.code = config.engineCode;
    if (existing.displacementCc == null && config.displacementCc != null) data.displacementCc = config.displacementCc;
    if (existing.fuelType == null && config.fuelType != null) data.fuelType = config.fuelType;
    if (existing.powerKw == null && config.powerKw != null) data.powerKw = config.powerKw;
    if (existing.powerPs == null && config.powerPs != null) data.powerPs = config.powerPs;
    if (existing.torqueNm == null && config.torqueNm != null) data.torqueNm = config.torqueNm;
    if (existing.cylinders == null && config.cylinders != null) data.cylinders = config.cylinders;
    if (existing.valves == null && config.valves != null) data.valves = config.valves;
    if (existing.aspiration == null && config.aspiration != null) data.aspiration = config.aspiration;
    if (existing.transmissionTypes == null && config.transmissionTypes != null) {
      data.transmissionTypes = config.transmissionTypes;
    }
    if (existing.metadata == null && config.metadata != null) data.metadata = config.metadata;
    if (Object.keys(data).length > 0) {
      await prisma.catalogEngine.update({ where: { id: existing.id }, data });
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
      metadata: config.metadata ?? undefined,
      externalId: slugify(name).slice(0, 120),
      source: SOURCE,
    },
    select: { id: true },
  });
  return created.id;
}

async function importCatalog(prisma, catalog) {
  const startedAt = Date.now();
  let modelYears = 0;
  const estimatedYears = estimateModelYears(catalog);
  const modelYearBatch = [];

  console.log(
    `[catalog] Seeding ${catalog.length} manufacturers (~${estimatedYears.toLocaleString()} model years)...`,
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

      // A model can carry both a broad production-year range and a few
      // trim-level configs that only know the newest model year. Expanding just
      // the configs used to discard the broad range, so e.g. a Ford Maverick
      // built 2022-2026 offered nothing but 2026 (issue #9). Any base year that
      // no config claims is emitted as a plain "Standard / Base" configuration.
      //
      // Only *explicit* year data counts: `modelProductionYears` guesses
      // 1990..today when a model has no years at all, which is exactly the shape
      // of a trim-level entry like "Sierra 1500 AT4" — topping that up would
      // invent decades of model years that never existed.
      const declaredConfigs = model.configs?.length ? model.configs : [];
      const hasExplicitBaseYears = Boolean(
        model.years?.length || model.yearFrom != null || model.yearTo != null,
      );
      const coveredYears = new Set();
      for (const config of declaredConfigs) {
        for (const year of configProductionYears(config, model)) coveredYears.add(year);
      }
      const uncoveredYears = hasExplicitBaseYears
        ? modelProductionYears(model).filter((year) => !coveredYears.has(year))
        : [];

      const passes = [
        ...declaredConfigs.map((config) => ({
          config,
          years: configProductionYears(config, model),
        })),
        ...(uncoveredYears.length > 0
          ? [{ config: { variantName: "Standard", engineName: "Base" }, years: uncoveredYears }]
          : []),
      ];

      for (const { config, years } of passes) {
        for (const range of groupYearsIntoGenerations(years)) {
          const generationId = await upsertGeneration(prisma, series.id, range);
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

    const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `[catalog] ${mIndex + 1}/${catalog.length} ${entry.name} - ${modelYears.toLocaleString()} model years (${elapsedSec}s)`,
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

  const totalSec = Math.round((Date.now() - startedAt) / 1000);
  console.log(
    `[catalog] Done: ${catalog.length} manufacturers, ${modelYears.toLocaleString()} model years in ${totalSec}s`,
  );
}

/**
 * Decide what the entrypoint should do, without importing anything:
 *
 * - `skip`       already on the current dataset version
 * - `blocking`   empty catalog (fresh install) \u2014 the app is unusable without it
 * - `background` catalog present but outdated \u2014 top up while the app is already
 *                serving, so a Force Update never looks like a long outage.
 *                The import is upsert-only, so the catalog just gets better
 *                while it runs; nothing is missing that was there before.
 */
async function resolvePlan(prisma) {
  const state = await prisma.catalogSyncState.findUnique({
    where: { source: SOURCE },
    select: { datasetVersion: true },
  });
  if (state?.datasetVersion === BUNDLED_CATALOG_DATASET_VERSION) return "skip";
  const existing = await prisma.catalogModelYear.count();
  return existing > 0 ? "background" : "blocking";
}

async function main() {
  const planOnly = process.argv.includes("--plan");
  const prisma = createPrismaClient();
  try {
    const plan = await resolvePlan(prisma);

    if (planOnly) {
      process.stdout.write(`${plan}\n`);
      return;
    }

    if (plan === "skip") {
      const existing = await prisma.catalogModelYear.count();
      console.log(`[catalog] Already seeded (${existing.toLocaleString()} model years) - skipping`);
      return;
    }

    console.log("[catalog] Loading bundled catalog JSON...");
    const catalog = JSON.parse(readFileSync(catalogPath, "utf-8").replace(/^\uFEFF/, ""));
    await importCatalog(prisma, catalog);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[catalog] Seed failed:", error);
  process.exit(1);
});

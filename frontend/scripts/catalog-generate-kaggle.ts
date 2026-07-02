#!/usr/bin/env tsx
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type {
  BundledEngineConfig,
  BundledManufacturer,
  BundledModel,
} from "../lib/catalog/bundled-types";
import {
  buildEngineName,
  canonicalizeBrand,
  canonicalizeKnownBrand,
  cubicInchesToCc,
  parseAspiration,
  parseCylinders,
  parseDisplacementCc,
  parseFuelType,
  normalizeModelName,
  parsePowerPs,
  parsePriceUsd,
  parseSeats,
  parseTopSpeedKmh,
  parseTorqueNm,
  parseZeroToHundred,
  powerKwFromPs,
  resolveBrandAndModel,
  slugify,
} from "../lib/catalog/datasets/parse";

const OUTPUT = path.join(process.cwd(), "prisma", "seed", "catalog.generated.json");
const DEFAULT_CARS_2025 = path.join(
  process.cwd(),
  "..",
  ".tmp",
  "catalog-data",
  "cars-datasets-2025",
  "Cars Datasets 2025.csv",
);
const DEFAULT_AUTOMOBILE = path.join(
  process.cwd(),
  "..",
  ".tmp",
  "catalog-data",
  "automobile-dataset",
  "Automobile.csv",
);

type Cars2025Row = {
  "Company Names": string;
  "Cars Names": string;
  Engines: string;
  "CC/Battery Capacity": string;
  HorsePower: string;
  "Total Speed": string;
  "Performance(0 - 100 )KM/H": string;
  "Cars Prices": string;
  "Fuel Types": string;
  Seats: string;
  Torque: string;
};

type AutomobileRow = {
  name: string;
  mpg: string;
  cylinders: string;
  displacement: string;
  horsepower: string;
  weight: string;
  acceleration: string;
  model_year: string;
  origin: string;
};

function readCsv<T>(filePath: string): T[] {
  return parse(readFileSync(filePath, "utf-8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];
}

function parseArgs(): { cars2025: string; automobile: string } {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args.set(match[1]!, match[2]!);
  }
  return {
    cars2025: args.get("cars2025") ?? DEFAULT_CARS_2025,
    automobile: args.get("automobile") ?? DEFAULT_AUTOMOBILE,
  };
}

function modelYears(model: BundledModel): number[] {
  if (model.years?.length) return [...new Set(model.years)].sort((a, b) => a - b);
  if (model.yearFrom != null) {
    const end = model.yearTo ?? model.yearFrom;
    const years: number[] = [];
    for (let year = model.yearFrom; year <= end; year++) years.push(year);
    return years;
  }
  return [];
}

function inferUnspecifiedSpecYears(model: BundledModel | undefined): number[] {
  const years = model ? modelYears(model) : [];
  const maxYear = years.filter((year) => year <= new Date().getFullYear()).at(-1);
  return [maxYear ?? new Date().getFullYear()];
}

function configYears(config: BundledEngineConfig): number[] {
  if (config.years?.length) return [...new Set(config.years)].sort((a, b) => a - b);
  if (config.yearFrom == null) return [];
  const end = config.yearTo ?? config.yearFrom;
  const years: number[] = [];
  for (let year = config.yearFrom; year <= end; year++) years.push(year);
  return years;
}

function configFingerprint(config: BundledEngineConfig): string {
  return [
    config.variantName ?? "Standard",
    config.engineName ?? "Base",
    config.engineCode ?? "",
    config.displacementCc ?? "",
    config.fuelType ?? "",
    config.powerPs ?? "",
    config.powerKw ?? "",
    config.torqueNm ?? "",
    config.cylinders ?? "",
    configYears(config).join(","),
  ].join("|").toLowerCase();
}

function upsertConfig(model: BundledModel, config: BundledEngineConfig) {
  const configs = model.configs ?? [];
  const key = configFingerprint(config);
  if (!configs.some((existing) => configFingerprint(existing) === key)) {
    configs.push(config);
  }
  configs.sort((a, b) => {
    const yearDiff = (b.years?.[0] ?? b.yearFrom ?? 0) - (a.years?.[0] ?? a.yearFrom ?? 0);
    if (yearDiff !== 0) return yearDiff;
    return (a.engineName ?? "").localeCompare(b.engineName ?? "");
  });
  model.configs = configs;
}

function findOrCreateManufacturer(
  bySlug: Map<string, BundledManufacturer>,
  brand: { slug: string; name: string; country: string | null },
): BundledManufacturer {
  const existing = bySlug.get(brand.slug);
  if (existing) {
    existing.name = brand.name;
    if (!existing.country || existing.country === "XX") existing.country = brand.country ?? "XX";
    return existing;
  }

  const created: BundledManufacturer = {
    slug: brand.slug,
    name: brand.name,
    country: brand.country ?? "XX",
    models: [],
  };
  bySlug.set(brand.slug, created);
  return created;
}

function findOrCreateModel(manufacturer: BundledManufacturer, modelName: string): BundledModel {
  const modelSlug = slugify(modelName);
  const existing = manufacturer.models.find((model) => slugify(model.name) === modelSlug);
  if (existing) {
    if (existing.name === existing.name.toUpperCase() && modelName !== modelName.toUpperCase()) {
      existing.name = modelName;
    }
    return existing;
  }

  const created: BundledModel = { name: modelName, years: [] };
  manufacturer.models.push(created);
  return created;
}

function addCars2025(rows: Cars2025Row[], bySlug: Map<string, BundledManufacturer>) {
  let added = 0;
  for (const row of rows) {
    const resolved = resolveBrandAndModel(row["Company Names"], row["Cars Names"]);
    if (!resolved) continue;

    const manufacturer = findOrCreateManufacturer(bySlug, resolved.brand);
    const model = findOrCreateModel(manufacturer, resolved.modelName);
    const fuelType = parseFuelType(`${row["Fuel Types"]} ${row.Engines}`);
    const isElectric = fuelType === "ELECTRIC";
    const powerPs = parsePowerPs(row.HorsePower);
    const displacementCc = parseDisplacementCc(row["CC/Battery Capacity"], { isElectric });
    const cylinders = parseCylinders(row.Engines);
    const years = inferUnspecifiedSpecYears(model);

    upsertConfig(model, {
      variantName: resolved.modelName,
      engineName: buildEngineName(row.Engines, { cylinders, displacementCc, isElectric }),
      years,
      displacementCc,
      fuelType,
      powerPs,
      powerKw: powerKwFromPs(powerPs),
      torqueNm: parseTorqueNm(row.Torque),
      cylinders,
      aspiration: parseAspiration(row.Engines),
      seats: parseSeats(row.Seats),
      metadata: {
        source: "kaggle:abdulmalik1518/cars-datasets-2025",
        rawPower: row.HorsePower || null,
        rawFuelType: row["Fuel Types"] || null,
        topSpeedKmh: parseTopSpeedKmh(row["Total Speed"]),
        zeroToHundredSec: parseZeroToHundred(row["Performance(0 - 100 )KM/H"]),
        priceUsd: parsePriceUsd(row["Cars Prices"]),
      },
    });
    added++;
  }
  return added;
}

function splitAutomobileName(rawName: string): { brand: ReturnType<typeof canonicalizeBrand>; modelName: string } | null {
  const words = rawName.trim().replace(/\s+/g, " ").split(" ");
  for (let count = Math.min(3, words.length - 1); count >= 1; count--) {
    const brand = canonicalizeKnownBrand(words.slice(0, count).join(" "));
    if (!brand) continue;
    const modelName = words.slice(count).join(" ");
    if (!modelName) continue;
    return { brand, modelName };
  }
  return null;
}

function addAutomobile(rows: AutomobileRow[], bySlug: Map<string, BundledManufacturer>) {
  let added = 0;
  for (const row of rows) {
    const split = splitAutomobileName(row.name);
    if (!split?.brand) continue;

    const shortYear = Number.parseInt(row.model_year, 10);
    if (!Number.isInteger(shortYear)) continue;
    const year = shortYear >= 30 ? 1900 + shortYear : 2000 + shortYear;
    const hp = Number.parseInt(row.horsepower, 10);
    const cylinders = Number.parseInt(row.cylinders, 10);
    const displacementCi = Number.parseFloat(row.displacement);
    const displacementCc = Number.isFinite(displacementCi)
      ? cubicInchesToCc(displacementCi)
      : null;

    const manufacturer = findOrCreateManufacturer(bySlug, split.brand);
    const model = findOrCreateModel(manufacturer, split.modelName);

    upsertConfig(model, {
      variantName: "Standard",
      engineName: [
        Number.isFinite(cylinders) ? `${cylinders}-cyl` : null,
        Number.isFinite(displacementCi) ? `${Math.round(displacementCi)} ci` : null,
      ]
        .filter(Boolean)
        .join(" ") || "Base",
      years: [year],
      displacementCc,
      fuelType: "PETROL",
      powerPs: Number.isFinite(hp) ? hp : null,
      powerKw: Number.isFinite(hp) ? powerKwFromPs(hp) : null,
      cylinders: Number.isFinite(cylinders) ? cylinders : null,
      metadata: {
        source: "kaggle:tawfikelmetwally/automobile-dataset",
        mpg: Number.parseFloat(row.mpg) || null,
        weightLbs: Number.parseInt(row.weight, 10) || null,
        zeroToSixtyMphSec: Number.parseFloat(row.acceleration) || null,
        origin: row.origin || null,
      },
    });
    added++;
  }
  return added;
}

function normalizeCatalog(catalog: BundledManufacturer[]): BundledManufacturer[] {
  const manufacturersByName = new Map<string, BundledManufacturer>();
  for (const manufacturer of catalog) {
    const key = slugify(manufacturer.name).replace(/-/g, "");
    const existing = manufacturersByName.get(key);
    if (!existing) {
      manufacturersByName.set(key, manufacturer);
      continue;
    }

    const keep = preferManufacturer(existing, manufacturer);
    const merge = keep === existing ? manufacturer : existing;
    keep.models.push(...merge.models);
    if ((!keep.country || keep.country === "XX") && merge.country && merge.country !== "XX") {
      keep.country = merge.country;
    }
    manufacturersByName.set(key, keep);
  }

  for (const manufacturer of manufacturersByName.values()) {
    const modelBySlug = new Map<string, BundledModel>();
    for (const model of manufacturer.models) {
      const normalizedName = normalizeModelName(model.name, manufacturer) ?? model.name;
      model.name = normalizedName;
      const key = slugify(model.name);
      const existing = modelBySlug.get(key);
      if (!existing) {
        if (model.years?.length) model.years = [...new Set(model.years)].sort((a, b) => a - b);
        modelBySlug.set(key, model);
        continue;
      }

      existing.years = [...new Set([...modelYears(existing), ...modelYears(model)])].sort((a, b) => a - b);
      for (const config of model.configs ?? []) upsertConfig(existing, config);
    }
    manufacturer.models = [...modelBySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  return [...manufacturersByName.values()]
    .filter((manufacturer) => manufacturer.models.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function preferManufacturer(a: BundledManufacturer, b: BundledManufacturer): BundledManufacturer {
  const score = (manufacturer: BundledManufacturer) => {
    let value = 0;
    if (!manufacturer.slug.includes("_")) value += 4;
    if (manufacturer.name !== manufacturer.name.toUpperCase()) value += 2;
    if (manufacturer.country && manufacturer.country !== "XX") value += 1;
    return value;
  };
  return score(b) > score(a) ? b : a;
}

function main() {
  const { cars2025, automobile } = parseArgs();
  if (!existsSync(OUTPUT)) {
    throw new Error(`Missing base catalog JSON: ${OUTPUT}`);
  }
  if (!existsSync(cars2025)) {
    throw new Error(`Missing Cars Datasets 2025 CSV: ${cars2025}`);
  }
  if (!existsSync(automobile)) {
    throw new Error(`Missing Automobile CSV: ${automobile}`);
  }

  const catalog = JSON.parse(
    readFileSync(OUTPUT, "utf-8").replace(/^\uFEFF/, ""),
  ) as BundledManufacturer[];
  const bySlug = new Map(catalog.map((entry) => [entry.slug, entry] as const));
  const carsAdded = addCars2025(readCsv<Cars2025Row>(cars2025), bySlug);
  const automobileAdded = addAutomobile(readCsv<AutomobileRow>(automobile), bySlug);
  const normalized = normalizeCatalog([...bySlug.values()]);

  let modelCount = 0;
  let configCount = 0;
  for (const manufacturer of normalized) {
    modelCount += manufacturer.models.length;
    for (const model of manufacturer.models) configCount += model.configs?.length ?? 0;
  }

  writeFileSync(OUTPUT, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  console.log(
    `Merged Kaggle catalog rows: ${carsAdded} Cars 2025, ${automobileAdded} Automobile`,
  );
  console.log(
    `Wrote ${normalized.length} manufacturers, ${modelCount} models, ${configCount} engine configs`,
  );
}

main();

#!/usr/bin/env tsx
/**
 * Regenerate prisma/seed/catalog.generated.json from open-vehicle-db (OVD)
 * plus cardata.wiki for manufacturers missing from OVD (e.g. Volkswagen).
 *
 * Run from frontend/: npx tsx scripts/catalog-generate-bundled.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import {
  fetchMakesAndModels,
  type OvdMakeEntry,
} from "../lib/catalog/sources/open-vehicle-db";
import {
  loadCardataRows,
  type CardataRow,
} from "../lib/catalog/sources/cardata-wiki";

const OUTPUT = path.join(process.cwd(), "prisma", "seed", "catalog.generated.json");
const LEGACY = path.join(process.cwd(), "prisma", "seed", "catalog.legacy.json");

const COUNTRY_BY_MAKE: Record<string, string> = {
  acura: "JP",
  "alfa-romeo": "IT",
  alpine: "FR",
  "aston-martin": "GB",
  audi: "DE",
  bentley: "GB",
  bmw: "DE",
  bugatti: "FR",
  buick: "US",
  byd: "CN",
  cadillac: "US",
  caterham: "GB",
  chery: "CN",
  chevrolet: "US",
  chrysler: "US",
  citroen: "FR",
  cupra: "ES",
  dacia: "RO",
  daewoo: "KR",
  dodge: "US",
  "ds-automobiles": "FR",
  ferrari: "IT",
  fiat: "IT",
  ford: "US",
  genesis: "KR",
  gmc: "US",
  honda: "JP",
  hyundai: "KR",
  infiniti: "JP",
  jaguar: "GB",
  jeep: "US",
  kia: "KR",
  "land-rover": "GB",
  lexus: "JP",
  lincoln: "US",
  lotus: "GB",
  mazda: "JP",
  "mercedes-benz": "DE",
  mg: "GB",
  mini: "GB",
  mitsubishi: "JP",
  nissan: "JP",
  opel: "DE",
  peugeot: "FR",
  porsche: "DE",
  renault: "FR",
  seat: "ES",
  skoda: "CZ",
  smart: "DE",
  subaru: "JP",
  suzuki: "JP",
  tesla: "US",
  toyota: "JP",
  volkswagen: "DE",
  volvo: "SE",
};

/** Prefer cardata years for these legacy-only manufacturers (network fetch). */
const CARDATA_PRIORITY_SLUGS = new Set([
  "volkswagen",
  "audi",
  "bmw",
  "mercedes-benz",
  "opel",
  "seat",
  "skoda",
  "cupra",
  "porsche",
  "ford",
  "renault",
  "peugeot",
  "citroen",
  "fiat",
  "toyota",
  "honda",
  "hyundai",
  "kia",
  "nissan",
  "mazda",
  "volvo",
]);
/** Cardata slug may differ from our catalog slug. */
const CARDATA_SLUG_ALIASES: Record<string, string> = {
  "mercedes-benz": "mercedes-benz",
  "land-rover": "land-rover",
  "alfa-romeo": "alfa-romeo",
};

type BundledModel = {
  name: string;
  years: number[];
  yearFrom: number;
  yearTo: number;
};

type BundledManufacturer = {
  slug: string;
  name: string;
  country: string;
  models: BundledModel[];
};

type LegacyModel = {
  name: string;
  yearFrom?: number;
  yearTo?: number;
  years?: number[];
};

type LegacyManufacturer = {
  slug: string;
  name: string;
  country: string;
  models: LegacyModel[];
};

function yearsFromRange(from: number, to: number): number[] {
  const years: number[] = [];
  for (let year = from; year <= to; year++) {
    years.push(year);
  }
  return years;
}

function finalizeModel(name: string, years: number[]): BundledModel | null {
  const unique = [...new Set(years)].sort((a, b) => a - b);
  if (unique.length === 0) return null;
  return {
    name,
    years: unique,
    yearFrom: unique[0]!,
    yearTo: unique[unique.length - 1]!,
  };
}

function makeToBundled(make: OvdMakeEntry): BundledManufacturer {
  const models: BundledModel[] = [];

  for (const model of Object.values(make.models)) {
    const finalized = finalizeModel(model.model_name, model.years);
    if (finalized) models.push(finalized);
  }

  models.sort((a, b) => a.name.localeCompare(b.name));

  return {
    slug: make.make_slug,
    name: make.make_name,
    country: COUNTRY_BY_MAKE[make.make_slug] ?? "XX",
    models,
  };
}

function modelsFromCardataRows(rows: CardataRow[]): BundledModel[] {
  const yearsByModel = new Map<string, Set<number>>();

  for (const row of rows) {
    const modelName = row.model?.trim();
    if (!modelName) continue;

    const from = Number.parseInt(row.yearFrom, 10);
    const to = Number.parseInt(row.yearTo, 10);
    if (Number.isNaN(from)) continue;

    const end = Number.isNaN(to) ? from : to;
    const bucket = yearsByModel.get(modelName) ?? new Set<number>();
    for (let year = from; year <= end; year++) {
      bucket.add(year);
    }
    yearsByModel.set(modelName, bucket);
  }

  const models: BundledModel[] = [];
  for (const [name, yearSet] of yearsByModel) {
    const finalized = finalizeModel(name, Array.from(yearSet));
    if (finalized) models.push(finalized);
  }

  models.sort((a, b) => a.name.localeCompare(b.name));
  return models;
}

function modelsFromLegacy(legacyModels: LegacyModel[], currentYear: number): BundledModel[] {
  const models: BundledModel[] = [];

  for (const model of legacyModels) {
    const years =
      model.years?.length
        ? model.years
        : yearsFromRange(model.yearFrom ?? 1990, model.yearTo ?? currentYear);
    const finalized = finalizeModel(model.name, years);
    if (finalized) models.push(finalized);
  }

  return models;
}

function loadLegacyCatalog(): LegacyManufacturer[] {
  if (existsSync(LEGACY)) {
    const raw = readFileSync(LEGACY, "utf-8").replace(/^\uFEFF/, "");
    return JSON.parse(raw) as LegacyManufacturer[];
  }

  try {
    const raw = execSync("git show HEAD:frontend/prisma/seed/catalog.generated.json", {
      encoding: "utf-8",
    });
    return JSON.parse(raw) as LegacyManufacturer[];
  } catch {
    return [];
  }
}

async function buildSupplementManufacturer(
  legacy: LegacyManufacturer,
  currentYear: number,
): Promise<BundledManufacturer | null> {
  const cardataSlug = CARDATA_SLUG_ALIASES[legacy.slug] ?? legacy.slug;

  if (CARDATA_PRIORITY_SLUGS.has(legacy.slug)) {
    try {
      const rows = await loadCardataRows(cardataSlug, { fetch: true });
      if (rows.length > 0) {
        const models = modelsFromCardataRows(rows);
        if (models.length > 0) {
          return {
            slug: legacy.slug,
            name: rows[0]?.make?.trim() || legacy.name,
            country: legacy.country || COUNTRY_BY_MAKE[legacy.slug] || "XX",
            models,
          };
        }
      }
    } catch {
      // Fall back to legacy model list below.
    }
  }

  const models = modelsFromLegacy(legacy.models, currentYear);
  if (models.length === 0) return null;

  return {
    slug: legacy.slug,
    name: legacy.name,
    country: legacy.country || COUNTRY_BY_MAKE[legacy.slug] || "XX",
    models,
  };
}

async function main() {
  console.log("Fetching open-vehicle-db makes and models…");
  const ovdMakes = await fetchMakesAndModels();
  const bySlug = new Map<string, BundledManufacturer>();

  for (const make of ovdMakes) {
    const bundled = makeToBundled(make);
    if (bundled.models.length > 0) {
      bySlug.set(bundled.slug, bundled);
    }
  }

  const legacyCatalog = loadLegacyCatalog();
  const missingLegacy = legacyCatalog.filter((entry) => !bySlug.has(entry.slug));
  console.log(
    `OVD: ${bySlug.size} manufacturers; supplementing ${missingLegacy.length} from cardata/legacy…`,
  );

  for (const legacy of missingLegacy) {
    const supplemented = await buildSupplementManufacturer(legacy, new Date().getFullYear());
    if (supplemented) {
      bySlug.set(supplemented.slug, supplemented);
      console.log(`  + ${supplemented.name} (${supplemented.models.length} models)`);
    }
  }

  const catalog = Array.from(bySlug.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  let modelCount = 0;
  let yearCount = 0;
  for (const entry of catalog) {
    modelCount += entry.models.length;
    for (const model of entry.models) {
      yearCount += model.years.length;
    }
  }

  writeFileSync(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`, "utf-8");

  const vw = catalog.find((entry) => entry.slug === "volkswagen");
  const scirocco = vw?.models.find((model) => model.name === "Scirocco");
  console.log(
    `Wrote ${catalog.length} manufacturers, ${modelCount} models, ${yearCount} model-years`,
  );
  if (scirocco) {
    console.log(
      `VW Scirocco: ${scirocco.yearFrom}–${scirocco.yearTo} (${scirocco.years.length} years)`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

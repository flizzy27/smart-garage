import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { BundledManufacturer } from "@/lib/catalog/bundled-types";
import { slugify } from "@/lib/catalog/datasets/parse";
import { normalizeManufacturerName } from "@/lib/catalog/normalize";

function loadCatalog(): BundledManufacturer[] {
  const file = path.join(process.cwd(), "prisma", "seed", "catalog.generated.json");
  return JSON.parse(readFileSync(file, "utf-8").replace(/^\uFEFF/, "")) as BundledManufacturer[];
}

describe("generated bundled catalog", () => {
  const catalog = loadCatalog();

  it("does not contain duplicate manufacturers or duplicate model choices", () => {
    const manufacturerSlugs = new Set<string>();
    const manufacturerNames = new Set<string>();
    for (const manufacturer of catalog) {
      expect(manufacturerSlugs.has(manufacturer.slug)).toBe(false);
      manufacturerSlugs.add(manufacturer.slug);
      const manufacturerName = normalizeManufacturerName(manufacturer.name);
      expect(manufacturerNames.has(manufacturerName)).toBe(false);
      manufacturerNames.add(manufacturerName);

      const modelSlugs = new Set<string>();
      for (const model of manufacturer.models) {
        const modelSlug = slugify(model.name);
        expect(modelSlugs.has(modelSlug)).toBe(false);
        modelSlugs.add(modelSlug);
      }
    }
  });

  it("contains Kaggle engine specs for Volkswagen Scirocco autofill", () => {
    const volkswagen = catalog.find((manufacturer) => manufacturer.slug === "volkswagen");
    const scirocco = volkswagen?.models.find((model) => model.name === "Scirocco");
    const turboConfig = scirocco?.configs?.find((config) => config.engineName === "2.0L Turbo I4");

    expect(turboConfig).toMatchObject({
      fuelType: "PETROL",
      powerPs: 280,
      torqueNm: 350,
      displacementCc: 1984,
      cylinders: 4,
    });
  });

  it("moves McLaren rows out of incorrect source manufacturers", () => {
    const mclaren = catalog.find((manufacturer) => manufacturer.slug === "mclaren");
    const bmw = catalog.find((manufacturer) => manufacturer.slug === "bmw");

    expect(mclaren?.models.some((model) => model.name.toLowerCase() === "720s")).toBe(true);
    expect(bmw?.models.some((model) => model.name.toLowerCase().includes("mclaren"))).toBe(false);
  });
});

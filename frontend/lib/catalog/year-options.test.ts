import { describe, expect, it } from "vitest";
import { listCatalogYearOptions } from "@/lib/catalog/year-options";
import type { CatalogYearConfigRow } from "@/lib/catalog/year-options";

function row(
  id: string,
  year: number,
  engine: Partial<CatalogYearConfigRow["engine"]> = {},
  variant: Partial<CatalogYearConfigRow["variant"]> = {},
): CatalogYearConfigRow {
  return {
    id,
    year,
    variant: {
      id: variant.id ?? "variant",
      name: variant.name ?? "Standard",
      bodyType: variant.bodyType ?? null,
      driveType: variant.driveType ?? null,
      generation: { id: "generation" },
    },
    engine: {
      id: engine.id ?? "engine",
      name: engine.name ?? "Base",
      code: engine.code ?? null,
      displacementCc: engine.displacementCc ?? null,
      fuelType: engine.fuelType ?? null,
      powerKw: engine.powerKw ?? null,
      powerPs: engine.powerPs ?? null,
      torqueNm: engine.torqueNm ?? null,
      cylinders: engine.cylinders ?? null,
    },
  };
}

describe("catalog year options", () => {
  it("offers every production year individually, newest first", () => {
    // Ranges used to collapse these into "2022-2025", which forced any
    // 2023/2024/2025 car to be saved as a 2022 (issue #9).
    const options = listCatalogYearOptions([
      row("a", 2022),
      row("b", 2023),
      row("c", 2024),
      row("d", 2025),
      row("e", 2026, { name: "2.0L EcoBoost", powerPs: 250 }),
    ]);

    expect(options.map((option) => option.label)).toEqual([
      "2026",
      "2025",
      "2024",
      "2023",
      "2022",
    ]);
  });

  it("keeps a single option per year even with several engines", () => {
    const options = listCatalogYearOptions([
      row("a", 2020, { id: "petrol", name: "2.0 TSI", powerPs: 245 }),
      row("b", 2020, { id: "diesel", name: "2.0 TDI", powerPs: 190 }),
      row("c", 2021, { id: "petrol", name: "2.0 TSI", powerPs: 245 }),
    ]);

    expect(options.map((option) => option.year)).toEqual([2021, 2020]);
  });

  it("removes placeholder configs only for years that have a detailed row", () => {
    const options = listCatalogYearOptions([
      row("base-2013", 2013),
      row("base-2014", 2014),
      row("real-2014", 2014, { name: "2.0L Turbo I4", powerPs: 280 }),
      row("base-2015", 2015),
    ]);

    expect(options.map((option) => option.label)).toEqual(["2015", "2014", "2013"]);
    // 2014 resolves to the detailed row, not the placeholder.
    expect(options.find((option) => option.year === 2014)?.id).toBe("real-2014");
  });

  it("picks a stable representative row for a year", () => {
    const first = listCatalogYearOptions([row("zz", 2020), row("aa", 2020)]);
    const second = listCatalogYearOptions([row("aa", 2020), row("zz", 2020)]);

    expect(first[0]?.id).toBe("aa");
    expect(second[0]?.id).toBe("aa");
  });

  it("reports each option as a single-year span", () => {
    const [option] = listCatalogYearOptions([row("a", 2019)]);
    expect(option.yearFrom).toBe(2019);
    expect(option.yearTo).toBe(2019);
  });

  it("returns nothing for an empty catalog", () => {
    expect(listCatalogYearOptions([])).toEqual([]);
  });
});

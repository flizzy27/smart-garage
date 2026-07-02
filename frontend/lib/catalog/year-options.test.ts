import { describe, expect, it } from "vitest";
import { groupCatalogYearsByConfiguration } from "@/lib/catalog/year-options";
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
  it("groups consecutive years with the same engine configuration set", () => {
    const options = groupCatalogYearsByConfiguration([
      row("a", 2014, { name: "EA888 Gen3", powerPs: 220 }),
      row("b", 2015, { name: "EA888 Gen3", powerPs: 220 }),
      row("c", 2016, { name: "EA888 Gen3", powerPs: 220 }),
      row("d", 2017, { name: "EA888 Gen3", powerPs: 220 }),
      row("e", 2018, { name: "EA888 Gen4", powerPs: 245 }),
    ]);

    expect(options.map((option) => option.label)).toEqual(["2018", "2014-2017"]);
  });

  it("removes placeholder configs only for years with detailed rows", () => {
    const options = groupCatalogYearsByConfiguration([
      row("base-2013", 2013),
      row("base-2014", 2014),
      row("real-2014", 2014, { name: "2.0L Turbo I4", powerPs: 280 }),
      row("base-2015", 2015),
    ]);

    expect(options.map((option) => option.label)).toEqual(["2015", "2014", "2013"]);
  });

  it("keeps one range when multiple engines share the same years", () => {
    const options = groupCatalogYearsByConfiguration([
      row("a", 2020, { id: "petrol", name: "2.0 TSI", powerPs: 245 }),
      row("b", 2020, { id: "diesel", name: "2.0 TDI", powerPs: 190 }),
      row("c", 2021, { id: "petrol", name: "2.0 TSI", powerPs: 245 }),
      row("d", 2021, { id: "diesel", name: "2.0 TDI", powerPs: 190 }),
    ]);

    expect(options).toHaveLength(1);
    expect(options[0]?.label).toBe("2020-2021");
  });
});

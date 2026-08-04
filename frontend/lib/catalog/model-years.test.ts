import { describe, expect, it } from "vitest";
import {
  expandModelYears,
  hasExplicitModelYears,
  selectableYears,
} from "@/lib/catalog/model-years";
import type { BundledModel } from "@/lib/catalog/bundled-types";

const CURRENT_YEAR = 2026;

describe("expandModelYears", () => {
  it("emits a single Standard/Base pass for a model without configs", () => {
    const model: BundledModel = { name: "Golf", years: [2019, 2020, 2021] };
    const passes = expandModelYears(model, CURRENT_YEAR);

    expect(passes).toHaveLength(1);
    expect(passes[0].config.variantName).toBe("Standard");
    expect(passes[0].years).toEqual([2019, 2020, 2021]);
  });

  it("keeps the model's production range when a trim only knows the newest year", () => {
    // This is the exact shape of the Ford Maverick entry from issue #9.
    const maverick: BundledModel = {
      name: "Maverick",
      years: [2022, 2023, 2024, 2025, 2026],
      configs: [{ variantName: "Maverick XLT", engineName: "I4", years: [2026] }],
    };

    expect(selectableYears(maverick, CURRENT_YEAR)).toEqual([
      2022, 2023, 2024, 2025, 2026,
    ]);
  });

  it("does not duplicate a year that a config already covers", () => {
    const model: BundledModel = {
      name: "Maverick",
      years: [2025, 2026],
      configs: [{ variantName: "XLT", years: [2026] }],
    };

    const passes = expandModelYears(model, CURRENT_YEAR);
    const base = passes.find((pass) => pass.config.variantName === "Standard");

    expect(base?.years).toEqual([2025]);
  });

  it("invents nothing for a trim-only entry with no stated years", () => {
    // "Sierra 1500 AT4" has no year data of its own; guessing 1990..today here
    // would claim the trim existed for three decades.
    const trimOnly: BundledModel = {
      name: "Sierra 1500 AT4",
      configs: [{ variantName: "Sierra 1500 AT4", years: [2026] }],
    };

    expect(hasExplicitModelYears(trimOnly)).toBe(false);
    expect(selectableYears(trimOnly, CURRENT_YEAR)).toEqual([2026]);
  });

  it("leaves a model whose configs carry no years unchanged", () => {
    const model: BundledModel = {
      name: "Sierra",
      years: [2024, 2025, 2026],
      configs: [{ variantName: "Sierra", engineName: "V8" }],
    };

    const passes = expandModelYears(model, CURRENT_YEAR);
    expect(passes).toHaveLength(1);
    expect(passes[0].years).toEqual([2024, 2025, 2026]);
  });

  it("never offers a year beyond next year", () => {
    const model: BundledModel = { name: "Concept", years: [2026, 2030, 2040] };
    expect(selectableYears(model, CURRENT_YEAR)).toEqual([2026, 2027].slice(0, 1));
  });

  it("expands a yearFrom/yearTo range", () => {
    const model: BundledModel = { name: "Beetle", yearFrom: 1998, yearTo: 2001 };
    expect(selectableYears(model, CURRENT_YEAR)).toEqual([1998, 1999, 2000, 2001]);
  });

  it("is strictly additive compared to the old configs-only rule", () => {
    const model: BundledModel = {
      name: "Maverick",
      years: [2022, 2023, 2024, 2025, 2026],
      configs: [
        { variantName: "Original", years: [1970, 1973] },
        { variantName: "XLT", years: [2026] },
      ],
    };

    const oldRule = new Set([1970, 1973, 2026]);
    const next = selectableYears(model, CURRENT_YEAR);

    for (const year of oldRule) {
      expect(next).toContain(year);
    }
    expect(next.length).toBeGreaterThan(oldRule.size);
  });
});

import type { BundledEngineConfig, BundledModel } from "@/lib/catalog/bundled-types";

/**
 * Turns one bundled model into the concrete (configuration, years) pairs the
 * importers write as `CatalogModelYear` rows.
 *
 * The bundled data mixes two sources: a vehicle registry that knows a model's
 * full production range but nothing about trims, and a model-year dataset that
 * knows trims but only for the newest year. Expanding just the trims threw the
 * production range away, so a Ford Maverick built 2022-2026 offered nothing but
 * 2026 — issue #9.
 *
 * Rules:
 *  - every declared config keeps its own years and its own detail
 *  - years the configs don't cover are emitted as a plain "Standard / Base"
 *  - a model with no explicit years is left alone, because
 *    `modelProductionYears` would otherwise guess a 1990..today range and
 *    invent three decades of history for a trim-only entry like
 *    "Sierra 1500 AT4"
 */
export type ExpandedModelYears = {
  config: BundledEngineConfig;
  years: number[];
};

const MIN_YEAR = 1886;
const DEFAULT_YEAR_FROM = 1990;

export function cleanYears(years: number[], currentYear: number): number[] {
  const maxYear = currentYear + 1;
  return [...new Set(years)]
    .filter((year) => Number.isInteger(year) && year >= MIN_YEAR && year <= maxYear)
    .sort((a, b) => a - b);
}

export function yearsFromRange(
  from: number,
  to: number,
  currentYear: number,
): number[] {
  const start = Math.max(MIN_YEAR, Math.min(from, to));
  const end = Math.min(currentYear + 1, Math.max(from, to));
  const years: number[] = [];
  for (let year = start; year <= end; year += 1) years.push(year);
  return years;
}

export function modelProductionYears(
  model: BundledModel,
  currentYear: number,
): number[] {
  if (model.years?.length) return cleanYears(model.years, currentYear);
  return yearsFromRange(
    model.yearFrom ?? DEFAULT_YEAR_FROM,
    model.yearTo ?? currentYear,
    currentYear,
  );
}

export function configProductionYears(
  config: BundledEngineConfig,
  model: BundledModel,
  currentYear: number,
): number[] {
  if (config.years?.length) return cleanYears(config.years, currentYear);
  if (config.yearFrom != null || config.yearTo != null) {
    return yearsFromRange(
      config.yearFrom ?? model.yearFrom ?? DEFAULT_YEAR_FROM,
      config.yearTo ?? config.yearFrom ?? model.yearTo ?? currentYear,
      currentYear,
    );
  }
  return modelProductionYears(model, currentYear);
}

export function hasExplicitModelYears(model: BundledModel): boolean {
  return Boolean(model.years?.length || model.yearFrom != null || model.yearTo != null);
}

export function expandModelYears(
  model: BundledModel,
  currentYear: number,
): ExpandedModelYears[] {
  const configs = model.configs ?? [];

  if (configs.length === 0) {
    return [
      {
        config: { variantName: "Standard", engineName: "Base" },
        years: modelProductionYears(model, currentYear),
      },
    ];
  }

  const covered = new Set<number>();
  const passes: ExpandedModelYears[] = configs.map((config) => {
    const years = configProductionYears(config, model, currentYear);
    for (const year of years) covered.add(year);
    return { config, years };
  });

  if (hasExplicitModelYears(model)) {
    const uncovered = modelProductionYears(model, currentYear).filter(
      (year) => !covered.has(year),
    );
    if (uncovered.length > 0) {
      passes.push({
        config: { variantName: "Standard", engineName: "Base" },
        years: uncovered,
      });
    }
  }

  return passes;
}

/** Every selectable production year for a model, deduplicated and sorted. */
export function selectableYears(model: BundledModel, currentYear: number): number[] {
  const years = new Set<number>();
  for (const pass of expandModelYears(model, currentYear)) {
    for (const year of pass.years) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

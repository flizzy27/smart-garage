export type CatalogYearConfigRow = {
  id: string;
  year: number;
  variant: {
    id: string;
    name: string;
    bodyType: string | null;
    driveType: string | null;
    doors?: number | null;
    seats?: number | null;
    generation: { id: string };
  };
  engine: {
    id: string;
    name: string;
    code: string | null;
    displacementCc: number | null;
    fuelType: string | null;
    powerKw: number | null;
    powerPs: number | null;
    torqueNm: number | null;
    cylinders: number | null;
  };
};

export type CatalogYearOption = {
  id: string;
  year: number;
  yearFrom: number;
  yearTo: number;
  label: string;
};

export function isPlaceholderCatalogConfig(row: CatalogYearConfigRow): boolean {
  return (
    row.variant.name === "Standard" &&
    row.engine.name === "Base" &&
    row.engine.code == null &&
    row.engine.displacementCc == null &&
    row.engine.fuelType == null &&
    row.engine.powerKw == null &&
    row.engine.powerPs == null &&
    row.engine.torqueNm == null &&
    row.engine.cylinders == null
  );
}

export function preferDetailedCatalogRows<T extends CatalogYearConfigRow>(rows: T[]): T[] {
  const rowsByYear = new Map<number, T[]>();
  for (const row of rows) {
    const bucket = rowsByYear.get(row.year) ?? [];
    bucket.push(row);
    rowsByYear.set(row.year, bucket);
  }

  const filtered: T[] = [];
  for (const bucket of rowsByYear.values()) {
    if (bucket.some((row) => !isPlaceholderCatalogConfig(row))) {
      filtered.push(...bucket.filter((row) => !isPlaceholderCatalogConfig(row)));
    } else {
      filtered.push(...bucket);
    }
  }
  return filtered;
}

/**
 * One selectable option per production year, newest first.
 *
 * The year the user picks becomes the vehicle's `productionYear`, so the list
 * must offer their actual year. Collapsing runs of years into a range like
 * "2022-2025" made that impossible: whichever range you picked, the vehicle was
 * recorded with the range's *first* year — a 2024 Maverick came out as a 2022
 * (issue #9). Ranges are therefore gone; the combobox is searchable, so a long
 * list is not a problem.
 *
 * Placeholder rows are still dropped for years that also have a real,
 * detailed configuration, and one representative row is kept per year.
 */
export function listCatalogYearOptions(
  rows: CatalogYearConfigRow[],
): CatalogYearOption[] {
  const filtered = preferDetailedCatalogRows(rows);
  const byYear = new Map<number, string>();

  for (const row of filtered) {
    const existing = byYear.get(row.year);
    // Stable representative: the lowest id wins, so the same year always
    // resolves to the same catalog row across requests.
    if (existing == null || row.id < existing) byYear.set(row.year, row.id);
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, id]) => ({
      id,
      year,
      yearFrom: year,
      yearTo: year,
      label: String(year),
    }));
}


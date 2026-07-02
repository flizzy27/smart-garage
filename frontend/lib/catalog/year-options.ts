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

function configSignature(row: CatalogYearConfigRow): string {
  return [
    row.variant.name,
    row.variant.bodyType ?? "",
    row.variant.driveType ?? "",
    row.engine.name,
    row.engine.code ?? "",
    row.engine.displacementCc ?? "",
    row.engine.fuelType ?? "",
    row.engine.powerKw ?? "",
    row.engine.powerPs ?? "",
    row.engine.torqueNm ?? "",
    row.engine.cylinders ?? "",
  ].join("|");
}

export function groupCatalogYearsByConfiguration(
  rows: CatalogYearConfigRow[],
): CatalogYearOption[] {
  const filtered = preferDetailedCatalogRows(rows);
  const configsByYear = new Map<number, { signatures: Set<string>; firstId: string }>();

  for (const row of filtered) {
    const bucket = configsByYear.get(row.year) ?? {
      signatures: new Set<string>(),
      firstId: row.id,
    };
    bucket.signatures.add(configSignature(row));
    if (row.id < bucket.firstId) bucket.firstId = row.id;
    configsByYear.set(row.year, bucket);
  }

  const years = [...configsByYear.keys()].sort((a, b) => a - b);
  const options: CatalogYearOption[] = [];
  let current: CatalogYearOption | null = null;
  let previousSignatureSet = "";

  for (const year of years) {
    const bucket = configsByYear.get(year)!;
    const signatureSet = [...bucket.signatures].sort().join("::");
    if (current && year === current.yearTo + 1 && signatureSet === previousSignatureSet) {
      current.yearTo = year;
      current.label = formatYearLabel(current.yearFrom, current.yearTo);
    } else {
      current = {
        id: bucket.firstId,
        year,
        yearFrom: year,
        yearTo: year,
        label: formatYearLabel(year, year),
      };
      options.push(current);
    }
    previousSignatureSet = signatureSet;
  }

  return options.sort((a, b) => b.yearFrom - a.yearFrom);
}

function formatYearLabel(from: number, to: number): string {
  return from === to ? String(from) : `${from}-${to}`;
}

import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse";

export const CARDATA_DATASET_VERSION = "cardata-wiki-csv-2026";
export const CARDATA_DOWNLOAD_BASE = "https://cardata.wiki/api/download/make";

export const CARDATA_SKIP_SLUGS = new Set([
  "contribute",
  "api-docs",
  "about",
  "privacy",
  "terms",
  "blog",
  "contact",
  "search",
  "makes",
  "login",
  "register",
  "pricing",
]);

export type CardataMakeSlug = string;

export type CardataRow = {
  make: string;
  model: string;
  variant: string;
  yearFrom: string;
  yearTo: string;
  bodyType: string;
  doors: string;
  seats: string;
  engineCode: string;
  engineDisplacement: string;
  engineCylinders: string;
  engineValves: string;
  engineFuelType: string;
  enginePowerBhp: string;
  enginePowerKw: string;
  engineTorqueNm: string;
  engineAspiration: string;
  enginePosition: string;
  gearboxType: string;
  gears: string;
  drivetrain: string;
};

function dataDir(): string {
  return join(process.cwd(), "data", "catalog", "cardata");
}

function makesManifestPath(): string {
  return join(dataDir(), "_makes.json");
}

export function cardataCsvPath(makeSlug: CardataMakeSlug): string {
  return join(dataDir(), `${makeSlug}.csv`);
}

export function makeSlugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function fetchCardataMakeSlugs(): Promise<string[]> {
  const res = await fetch("https://cardata.wiki/");
  if (!res.ok) {
    throw new Error(`cardata.wiki homepage fetch failed: ${res.status}`);
  }

  const html = await res.text();
  const slugs = [...html.matchAll(/href="\/([a-z0-9-]+)"/g)].map((m) => m[1]);
  const unique = [...new Set(slugs.filter((slug) => !CARDATA_SKIP_SLUGS.has(slug)))];

  mkdirSync(dataDir(), { recursive: true });
  writeFileSync(makesManifestPath(), JSON.stringify(unique, null, 2), "utf8");

  return unique;
}

export function loadCachedCardataMakeSlugs(): string[] {
  const manifest = makesManifestPath();
  if (existsSync(manifest)) {
    return JSON.parse(readFileSync(manifest, "utf8")) as string[];
  }
  return [];
}

export async function resolveCardataMakeSlugs(
  requested?: string[],
): Promise<string[]> {
  if (requested?.length) return requested;

  const cached = loadCachedCardataMakeSlugs();
  if (cached.length > 0) return cached;

  return fetchCardataMakeSlugs();
}

export async function downloadCardataCsv(
  makeSlug: CardataMakeSlug,
): Promise<string> {
  const url = `${CARDATA_DOWNLOAD_BASE}/${makeSlug}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`cardata.wiki download failed for ${makeSlug}: ${res.status}`);
  }

  const csv = await res.text();
  const dir = dataDir();
  mkdirSync(dir, { recursive: true });
  const path = cardataCsvPath(makeSlug);
  writeFileSync(path, csv, "utf8");
  return path;
}

export async function downloadAllCardataCsvs(
  makeSlugs: string[],
  onProgress?: (message: string) => void,
): Promise<{ downloaded: number; failed: string[] }> {
  const log = onProgress ?? (() => {});
  let downloaded = 0;
  const failed: string[] = [];

  for (const slug of makeSlugs) {
    try {
      await downloadCardataCsv(slug);
      downloaded++;
      log(`  Downloaded ${slug}.csv`);
    } catch {
      failed.push(slug);
      log(`  Failed to download ${slug}`);
    }
  }

  return { downloaded, failed };
}

export async function ensureCardataCsv(
  makeSlug: CardataMakeSlug,
  options: { fetch?: boolean } = {},
): Promise<string> {
  const path = cardataCsvPath(makeSlug);
  if (!options.fetch && existsSync(path)) {
    return path;
  }
  return downloadCardataCsv(makeSlug);
}

export async function parseCardataCsvFile(path: string): Promise<CardataRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CardataRow[] = [];
    createReadStream(path)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }),
      )
      .on("data", (row: CardataRow) => rows.push(row))
      .on("error", reject)
      .on("end", () => resolve(rows));
  });
}

export async function loadCardataRows(
  makeSlug: CardataMakeSlug,
  options: { fetch?: boolean } = {},
): Promise<CardataRow[]> {
  const path = await ensureCardataCsv(makeSlug, options);
  return parseCardataCsvFile(path);
}

export async function readCsvMakeName(makeSlug: string): Promise<string | null> {
  const path = cardataCsvPath(makeSlug);
  if (!existsSync(path)) return null;
  const rows = await parseCardataCsvFile(path);
  return rows[0]?.make?.trim() || null;
}

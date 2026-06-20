import { readFileSync } from "node:fs";
import path from "node:path";
import type { ManufacturerSeedEntry } from "./catalog";

export function loadManufacturerCatalog(): ManufacturerSeedEntry[] {
  const generatedPath = path.join(__dirname, "catalog.generated.json");
  const raw = readFileSync(generatedPath, "utf-8");
  const catalog = JSON.parse(raw) as ManufacturerSeedEntry[];

  const bySlug = new Map<string, ManufacturerSeedEntry>();
  for (const entry of catalog) {
    if (!bySlug.has(entry.slug)) {
      bySlug.set(entry.slug, entry);
    }
  }

  return Array.from(bySlug.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function slugifyManufacturerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

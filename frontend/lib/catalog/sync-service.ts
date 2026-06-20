import type { PrismaClient } from "@prisma/client";
import {
  importCardataWiki,
  type CardataImportOptions,
  type CardataImportStats,
} from "@/lib/catalog/importers/cardata-importer";
import {
  importNhtsaMakeIndex,
  importOpenVehicleDb,
  type ImportOptions,
  type ImportStats,
} from "@/lib/catalog/importers/ovd-importer";
import type { CardataMakeSlug } from "@/lib/catalog/sources/cardata-wiki";
import { prisma } from "@/lib/prisma";

const STALE_DAYS = 30;

export type SyncResult = {
  skipped: boolean;
  reason?: string;
  ovd?: ImportStats;
  cardata?: CardataImportStats;
  nhtsaMakes?: number;
};

export async function getCatalogCounts(client: PrismaClient = prisma) {
  const [
    manufacturers,
    series,
    generations,
    variants,
    engines,
    modelYears,
  ] = await Promise.all([
    client.catalogManufacturer.count(),
    client.catalogSeries.count(),
    client.catalogGeneration.count(),
    client.catalogVariant.count(),
    client.catalogEngine.count(),
    client.catalogModelYear.count(),
  ]);

  return { manufacturers, series, generations, variants, engines, modelYears };
}

export async function isCatalogStale(
  source: "OPEN_VEHICLE_DB" | "CARDATA_WIKI" = "OPEN_VEHICLE_DB",
  client: PrismaClient = prisma,
): Promise<boolean> {
  const state = await client.catalogSyncState.findUnique({
    where: { source },
  });
  if (!state?.lastSyncAt) return true;

  const ageMs = Date.now() - state.lastSyncAt.getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export async function syncCatalog(
  options: ImportOptions & { force?: boolean } = {},
): Promise<SyncResult> {
  const counts = await getCatalogCounts();
  const stale = await isCatalogStale("OPEN_VEHICLE_DB");

  if (!options.force && counts.modelYears > 0 && !stale) {
    return {
      skipped: true,
      reason: "Catalog is up to date",
    };
  }

  const log = options.onProgress ?? console.log;
  const ovd = await importOpenVehicleDb(prisma, options);
  const nhtsaMakes = await importNhtsaMakeIndex(prisma, log);

  return { skipped: false, ovd, nhtsaMakes };
}

export async function syncCardataCatalog(
  options: CardataImportOptions & { force?: boolean } = {},
): Promise<SyncResult> {
  const cardataCounts = await getCardataCounts();
  const stale = await isCatalogStale("CARDATA_WIKI");

  if (!options.force && cardataCounts.modelYears > 0 && !stale) {
    return {
      skipped: true,
      reason: "Cardata catalog is up to date",
    };
  }

  const cardata = await importCardataWiki(prisma, options);
  return { skipped: false, cardata };
}

async function getCardataCounts(client: PrismaClient = prisma) {
  const manufacturers = await client.catalogManufacturer.findMany({
    where: { source: "CARDATA_WIKI" },
    select: { id: true },
  });
  if (manufacturers.length === 0) {
    return { modelYears: 0, engines: 0 };
  }

  const ids = manufacturers.map((m) => m.id);
  const modelYears = await client.catalogModelYear.count({
    where: { source: "CARDATA_WIKI" },
  });
  const engines = await client.catalogEngine.count({
    where: { source: "CARDATA_WIKI" },
  });

  return { modelYears, engines, manufacturerIds: ids };
}

export async function ensureCatalogSeeded(
  options: ImportOptions = {},
): Promise<SyncResult> {
  const counts = await getCatalogCounts();
  if (counts.modelYears > 0) {
    return { skipped: true, reason: "Catalog already populated" };
  }
  return syncCatalog({ ...options, force: true });
}

export type { CardataMakeSlug } from "@/lib/catalog/sources/cardata-wiki";

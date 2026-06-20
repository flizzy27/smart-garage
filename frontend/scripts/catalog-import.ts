#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";
import {
  getCatalogCounts,
  syncCardataCatalog,
  syncCatalog,
} from "../lib/catalog/sync-service";

const prisma = new PrismaClient();

const CARDATA_MAKE_ALIASES: Record<string, string> = {
  volkswagen: "volkswagen",
  vw: "volkswagen",
  audi: "audi",
  porsche: "porsche",
  skoda: "skoda",
  "mercedes-benz": "mercedes-benz",
  mercedes: "mercedes-benz",
  bmw: "bmw",
  seat: "seat",
  cupra: "cupra",
};

function parseMakeSlugs(args: string[]): string[] | undefined {
  const slugs = args
    .filter((arg) => arg.startsWith("--make="))
    .map((arg) => arg.replace("--make=", "").toLowerCase())
    .map((slug) => CARDATA_MAKE_ALIASES[slug] ?? slug);

  return slugs.length > 0 ? slugs : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const quick = args.includes("--quick");
  const force = args.includes("--force");
  const ci = args.includes("--ci");
  const fetch = args.includes("--fetch");
  const source =
    args.find((arg) => arg.startsWith("--source="))?.replace("--source=", "") ??
    "ovd";

  const makeSlugs = parseMakeSlugs(args);

  console.log("Smart Garage — vehicle catalog import");
  console.log(
    `Source: ${source}${force ? ", force" : ""}${fetch ? ", fetch" : ""}`,
  );

  if (source === "cardata") {
    const result = await syncCardataCatalog({
      force,
      fetch,
      makeSlugs,
      onProgress: (message) => console.log(message),
    });

    if (result.skipped) {
      console.log(`Skipped: ${result.reason}`);
    } else if (result.cardata) {
      console.log("Cardata import complete:", result.cardata);
    }
  } else {
    const ovdMakeSlugs = args
      .filter((arg) => arg.startsWith("--make="))
      .map((arg) => arg.replace("--make=", ""));

    console.log(`Mode: ${quick || ci ? "quick" : "full"}${force ? ", force" : ""}`);

    const result = await syncCatalog({
      quick: quick || ci,
      force,
      makeSlugs: ci
        ? ["audi", "bmw", "porsche", "mercedes_benz", "peugeot"]
        : ovdMakeSlugs.length > 0
          ? ovdMakeSlugs
          : undefined,
      onProgress: (message) => console.log(message),
    });

    if (result.skipped) {
      console.log(`Skipped: ${result.reason}`);
    } else {
      console.log("Import complete:", result.ovd);
      if (result.nhtsaMakes != null) {
        console.log(`NHTSA makes synced: ${result.nhtsaMakes}`);
      }
    }
  }

  const counts = await getCatalogCounts(prisma);
  console.log("Catalog totals:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

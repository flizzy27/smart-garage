#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";
import { normalizeCatalogLabel, normalizeManufacturerName } from "../lib/catalog/normalize";

const prisma = new PrismaClient();

async function countDuplicateNames<T extends { name: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = normalizeCatalogLabel(item.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return [...groups.entries()].filter(([, v]) => v.length > 1);
}

async function main() {
  console.log("Smart Garage — catalog duplicate audit\n");

  const manufacturers = await prisma.catalogManufacturer.findMany({
    select: { id: true, name: true, slug: true, source: true },
    orderBy: { name: "asc" },
  });

  const mfrGroups = new Map<string, typeof manufacturers>();
  for (const m of manufacturers) {
    const key = normalizeManufacturerName(m.name);
    if (!mfrGroups.has(key)) mfrGroups.set(key, []);
    mfrGroups.get(key)!.push(m);
  }

  const dupMfr = [...mfrGroups.entries()].filter(([, v]) => v.length > 1);
  console.log(`Manufacturers: ${manufacturers.length}, duplicate names: ${dupMfr.length}`);
  for (const [key, items] of dupMfr.slice(0, 20)) {
    console.log(`  ${key}:`, items.map((i) => `${i.name} [${i.source}/${i.slug}]`).join(" | "));
  }

  const cardataMfrs = manufacturers.filter((m) => m.source === "CARDATA_WIKI");
  let totalSeriesDup = 0;
  let totalGenDup = 0;
  let totalVariantDup = 0;
  let totalEngineDup = 0;

  for (const mfr of cardataMfrs) {
    const series = await prisma.catalogSeries.findMany({
      where: { manufacturerId: mfr.id },
      select: { id: true, name: true },
    });
    const seriesDup = await countDuplicateNames(series);
    totalSeriesDup += seriesDup.length;

    for (const s of series) {
      const generations = await prisma.catalogGeneration.findMany({
        where: { seriesId: s.id },
        select: { id: true, name: true, yearFrom: true, yearTo: true },
      });

      const genKeyGroups = new Map<string, typeof generations>();
      for (const g of generations) {
        const key = `${g.yearFrom}:${g.yearTo ?? ""}`;
        if (!genKeyGroups.has(key)) genKeyGroups.set(key, []);
        genKeyGroups.get(key)!.push(g);
      }
      totalGenDup += [...genKeyGroups.values()].filter((v) => v.length > 1).length;

      for (const g of generations) {
        const variants = await prisma.catalogVariant.findMany({
          where: { generationId: g.id },
          select: { id: true, name: true },
        });
        const variantDup = await countDuplicateNames(variants);
        totalVariantDup += variantDup.length;

        for (const v of variants) {
          const engines = await prisma.catalogEngine.findMany({
            where: { variantId: v.id },
            select: { id: true, name: true },
          });
          const engineDup = await countDuplicateNames(engines);
          totalEngineDup += engineDup.length;
        }
      }
    }
  }

  console.log(`\nCARDATA_WIKI makes: ${cardataMfrs.length}`);
  console.log(`Duplicate series groups: ${totalSeriesDup}`);
  console.log(`Duplicate generation groups: ${totalGenDup}`);
  console.log(`Duplicate variant groups: ${totalVariantDup}`);
  console.log(`Duplicate engine groups: ${totalEngineDup}`);

  const vw = await prisma.catalogManufacturer.findUnique({ where: { slug: "volkswagen" } });
  if (vw) {
    const seriesCount = await prisma.catalogSeries.count({ where: { manufacturerId: vw.id } });
    console.log(`\nVolkswagen CARDATA series count: ${seriesCount}`);
  }

  const vwShadow = await prisma.catalogManufacturer.findFirst({
    where: { slug: { startsWith: "volkswagen-" }, source: "NHTSA_VPIC" },
  });
  console.log(`Volkswagen NHTSA shadow: ${vwShadow ? vwShadow.slug : "none"}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

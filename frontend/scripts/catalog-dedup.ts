#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";
import { runCatalogDedup } from "../lib/catalog/dedup-catalog";

const prisma = new PrismaClient();

async function main() {
  console.log("Smart Garage — catalog deduplication\n");
  const result = await runCatalogDedup(prisma, (message) => console.log(message));
  console.log("\nDone:", result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

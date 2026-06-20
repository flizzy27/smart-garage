import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [templates, manufacturers, schedules, modelYears] = await Promise.all([
    prisma.maintenanceTemplate.count(),
    prisma.catalogManufacturer.count({ where: { source: "CARDATA_WIKI" } }),
    prisma.vehicleMaintenanceSchedule.count(),
    prisma.catalogModelYear.count(),
  ]);
  console.log({ templates, cardataManufacturers: manufacturers, schedules, modelYears });
}

main()
  .finally(() => prisma.$disconnect());

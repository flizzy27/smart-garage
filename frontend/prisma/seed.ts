import { PrismaClient } from "@prisma/client";
import { seedMaintenanceTemplates } from "../lib/services/maintenance";

const prisma = new PrismaClient();

async function main() {
  await seedMaintenanceTemplates();

  const [users, vehicles, templates] = await Promise.all([
    prisma.user.count(),
    prisma.vehicle.count({ where: { deletedAt: null } }),
    prisma.maintenanceTemplate.count(),
  ]);
  console.log(
    `Seed complete: ${users} user(s), ${vehicles} vehicle(s), ${templates} maintenance template(s)`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

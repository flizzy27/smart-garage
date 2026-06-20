import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { buildUserExport, expensesToCsv } from "@/lib/export/backup";
import { prisma } from "@/lib/prisma";
import { vehicleAccessWhere } from "@/lib/vehicles/access";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "json";

    if (format === "csv") {
      const expenses = await prisma.expense.findMany({
        where: { vehicle: vehicleAccessWhere(userId) },
        orderBy: { occurredAt: "desc" },
      });
      const vehicles = await prisma.vehicle.findMany({
        where: vehicleAccessWhere(userId),
        select: { id: true, make: true, model: true, licensePlate: true },
      });
      const names = new Map(
        vehicles.map((v) => [
          v.id,
          [v.make, v.model].filter(Boolean).join(" ") || v.licensePlate || v.id,
        ]),
      );
      const csv = expensesToCsv(expenses, names);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="smart-garage-expenses.csv"`,
        },
      });
    }

    const data = await buildUserExport(userId);
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="smart-garage-backup.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

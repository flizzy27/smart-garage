import { NextResponse } from "next/server";
import {
  checkDatabaseConnection,
  getDatabaseStats,
} from "@/lib/repositories/database";

export const dynamic = "force-dynamic";

export async function GET() {
  const connected = await checkDatabaseConnection();

  if (!connected) {
    return NextResponse.json(
      {
        status: "error",
        version: process.env.APP_VERSION ?? "unknown",
        database: "disconnected",
      },
      { status: 503 },
    );
  }

  const stats = await getDatabaseStats();

  return NextResponse.json({
    status: "ok",
    version: process.env.APP_VERSION ?? "unknown",
    database: "connected",
    stats,
  });
}

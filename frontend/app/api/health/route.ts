import { NextResponse } from "next/server";
import {
  checkDatabaseConnection,
  getDatabaseStats,
} from "@/lib/repositories/database";
import { APP_VERSION } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export async function GET() {
  const connected = await checkDatabaseConnection();

  if (!connected) {
    return NextResponse.json(
      {
        status: "error",
        version: APP_VERSION,
        database: "disconnected",
      },
      { status: 503 },
    );
  }

  const stats = await getDatabaseStats();

  return NextResponse.json({
    status: "ok",
    version: APP_VERSION,
    database: "connected",
    stats,
  });
}

import { NextResponse } from "next/server";
import { searchCatalogSeries } from "@/lib/repositories/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const manufacturerId = searchParams.get("manufacturerId");
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? 25);

  if (!manufacturerId) {
    return NextResponse.json(
      { error: "manufacturerId required" },
      { status: 400 },
    );
  }

  const results = await searchCatalogSeries(manufacturerId, q, limit);

  return NextResponse.json({ results });
}

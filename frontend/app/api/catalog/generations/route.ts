import { NextResponse } from "next/server";
import { searchCatalogGenerations } from "@/lib/repositories/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seriesId = searchParams.get("seriesId");
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? 25);

  if (!seriesId) {
    return NextResponse.json({ error: "seriesId required" }, { status: 400 });
  }

  const results = await searchCatalogGenerations(seriesId, q, limit);

  return NextResponse.json({ results });
}

import { NextResponse } from "next/server";
import { searchCatalogManufacturers } from "@/lib/repositories/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? 25);

  const results = await searchCatalogManufacturers(q, limit);

  return NextResponse.json({ results });
}

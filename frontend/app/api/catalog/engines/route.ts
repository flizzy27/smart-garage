import { NextResponse } from "next/server";
import { searchCatalogEngines } from "@/lib/repositories/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get("variantId");
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? 25);

  if (!variantId) {
    return NextResponse.json({ error: "variantId required" }, { status: 400 });
  }

  const results = await searchCatalogEngines(variantId, q, limit);

  return NextResponse.json({ results });
}

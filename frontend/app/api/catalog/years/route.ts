import { NextResponse } from "next/server";
import { searchCatalogYears } from "@/lib/repositories/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get("variantId");
  const engineId = searchParams.get("engineId");
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? 25);

  if (!variantId || !engineId) {
    return NextResponse.json(
      { error: "variantId and engineId required" },
      { status: 400 },
    );
  }

  const results = await searchCatalogYears(variantId, engineId, q, limit);

  return NextResponse.json({ results });
}

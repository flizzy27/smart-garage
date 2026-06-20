import { NextResponse } from "next/server";
import { searchCatalogVariants } from "@/lib/repositories/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const generationId = searchParams.get("generationId");
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? 25);

  if (!generationId) {
    return NextResponse.json(
      { error: "generationId required" },
      { status: 400 },
    );
  }

  const results = await searchCatalogVariants(generationId, q, limit);

  return NextResponse.json({ results });
}

import { type NextRequest, NextResponse } from "next/server";
import { getConfigsForYear } from "@/lib/repositories/catalog";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seriesId = searchParams.get("seriesId");
  const yearRaw = searchParams.get("year");

  if (!seriesId || !yearRaw) {
    return NextResponse.json({ error: "seriesId and year are required" }, { status: 400 });
  }

  const year = parseInt(yearRaw, 10);
  if (Number.isNaN(year) || year < 1886 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const configs = await getConfigsForYear(seriesId, year);
  return NextResponse.json({ configs });
}

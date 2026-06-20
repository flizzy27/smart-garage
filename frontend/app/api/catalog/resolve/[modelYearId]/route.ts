import { NextResponse } from "next/server";
import { resolveCatalogModelYear } from "@/lib/catalog/resolve-spec";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ modelYearId: string }> },
) {
  const { modelYearId } = await context.params;
  const spec = await resolveCatalogModelYear(modelYearId);

  if (!spec) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  return NextResponse.json({ spec });
}

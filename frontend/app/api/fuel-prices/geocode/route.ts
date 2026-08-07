import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { describeLocation, searchPlaces } from "@/lib/fuel-prices/geocode";

export const dynamic = "force-dynamic";

/**
 * Address → coordinates (`?q=`) and coordinates → place name (`?lat=&lng=`).
 *
 * Proxied rather than called from the browser so the requests carry a
 * User-Agent identifying Smart Garage, as OpenStreetMap's usage policy
 * requires, and so repeated lookups share one server-side cache.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const query = params.get("q");

  try {
    if (query != null) {
      const results = await searchPlaces(query);
      return NextResponse.json({ ok: true, results });
    }

    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return NextResponse.json(
        { ok: false, reason: "invalid-request" },
        { status: 400 },
      );
    }

    const label = await describeLocation(lat, lng);
    return NextResponse.json({ ok: true, label });
  } catch {
    return NextResponse.json({ ok: false, reason: "upstream" }, { status: 502 });
  }
}

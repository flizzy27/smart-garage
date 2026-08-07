import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { routeBetween } from "@/lib/fuel-prices/routing";

export const dynamic = "force-dynamic";

function coordinate(value: string | null, limit: number): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > limit) return null;
  return parsed;
}

/**
 * Driving distance between two points, for the fuel calculator's route
 * planner. Proxied so the routing service is called from one place that can
 * cache, and so the browser is not making cross-origin calls on every keypress.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const fromLat = coordinate(params.get("fromLat"), 90);
  const fromLng = coordinate(params.get("fromLng"), 180);
  const toLat = coordinate(params.get("toLat"), 90);
  const toLng = coordinate(params.get("toLng"), 180);

  if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
    return NextResponse.json(
      { ok: false, reason: "invalid-request" },
      { status: 400 },
    );
  }

  try {
    const result = await routeBetween(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
    );
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, reason: "upstream" }, { status: 502 });
  }
}

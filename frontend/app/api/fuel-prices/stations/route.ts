import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  FuelPriceError,
  clampRadiusKm,
  listStationsNearby,
} from "@/lib/fuel-prices/tankerkoenig";
import { getFuelPriceConfig } from "@/lib/services/fuel-price-config";

export const dynamic = "force-dynamic";

/**
 * Proxy for the Tankerkönig radius search.
 *
 * The browser never talks to Tankerkönig directly: the API key must not leave
 * the server, and routing every client through one place is what makes the
 * shared cache (and therefore the rate limit) work.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const { apiKey } = await getFuelPriceConfig();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, reason: "not-configured" },
      { status: 503 },
    );
  }

  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radiusKm = clampRadiusKm(Number(params.get("radius")));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return NextResponse.json(
      { ok: false, reason: "invalid-location" },
      { status: 400 },
    );
  }

  try {
    const result = await listStationsNearby({ lat, lng, radiusKm }, apiKey);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof FuelPriceError) {
      const status =
        error.reason === "rate-limited"
          ? 429
          : error.reason === "not-configured"
            ? 503
            : error.reason === "timeout"
              ? 504
              : 502;
      return NextResponse.json(
        { ok: false, reason: error.reason },
        { status },
      );
    }
    return NextResponse.json({ ok: false, reason: "upstream" }, { status: 502 });
  }
}

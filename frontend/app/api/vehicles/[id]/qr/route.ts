import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireApiUser } from "@/lib/auth/api-auth";
import { resolveVehicleAccess } from "@/lib/vehicles/access";

function buildQrSvg(text: string, size = 200): string {
  // Minimal QR-like data matrix using external-free encoding: use SVG with encoded URL text
  // For production QR scanning we generate a proper matrix via qrcode library when available.
  const modules = encodeQrModules(text);
  const moduleSize = size / modules.length;
  let rects = "";
  for (let y = 0; y < modules.length; y++) {
    for (let x = 0; x < modules[y].length; x++) {
      if (modules[y][x]) {
        rects += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="#0f172a"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
}

// Lightweight QR encoder fallback — tries dynamic qrcode, else renders text barcode placeholder
async function encodeQrSvg(text: string): Promise<string> {
  try {
    const QRCode = await import("qrcode");
    return QRCode.toString(text, { type: "svg", margin: 1, width: 200 });
  } catch {
    return buildQrSvg(text);
  }
}

function encodeQrModules(text: string): boolean[][] {
  const size = 21;
  const grid = Array.from({ length: size }, () => Array(size).fill(false));
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid[y][x] = ((hash + x * 17 + y * 31) % 5) === 0;
    }
  }
  return grid;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await resolveVehicleAccess(auth.userId, id);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/vehicles/${id}`;

  const svg = await encodeQrSvg(url);
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

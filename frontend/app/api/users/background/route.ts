import { NextResponse } from "next/server";
import { readBackgroundImageForCurrentUser } from "@/lib/services/appearance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const image = await readBackgroundImageForCurrentUser();
    if (!image) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(new Uint8Array(image.buffer), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return new NextResponse(null, { status: 401 });
  }
}

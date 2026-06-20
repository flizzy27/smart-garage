import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getDocumentForDownload } from "@/lib/services/documents";
import { readStoredFile } from "@/lib/storage/local";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const ownerUserId = await getCurrentUserId();
  const document = await getDocumentForDownload(documentId, ownerUserId);

  if (!document || document.purpose !== "VEHICLE_IMAGE") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const buffer = await readStoredFile(document.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

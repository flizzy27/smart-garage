import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-auth";
import { getDocumentForDownload } from "@/lib/services/documents";
import { readStoredFile } from "@/lib/storage/local";
import { isViewableInline } from "@/lib/storage/paths";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const { documentId } = await context.params;
  const document = await getDocumentForDownload(documentId, auth.userId);

  if (!document) {
    return new NextResponse(null, { status: 404 });
  }

  const forceDownload = new URL(request.url).searchParams.get("download") === "1";
  const inline = !forceDownload && isViewableInline(document.mimeType);

  try {
    const buffer = await readStoredFile(document.storageKey);
    const filename = encodeURIComponent(document.originalFilename);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": inline
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export function getDocumentUrl(documentId: string, download = false): string {
  const params = download ? "?download=1" : "";
  return `/api/documents/${documentId}${params}`;
}

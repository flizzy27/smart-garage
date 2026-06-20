"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DocumentCategory } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  deleteDocumentFormAction,
  uploadDocumentAction,
  type DocumentActionResult,
} from "@/lib/actions/documents";
import { getDocumentUrl } from "@/lib/documents/urls";
import type { SerializedDocument } from "@/lib/repositories/documents";

const CATEGORIES = [
  DocumentCategory.INVOICE,
  DocumentCategory.INSPECTION,
  DocumentCategory.REGISTRATION,
  DocumentCategory.INSURANCE,
  DocumentCategory.OTHER,
] as const;

type VehicleOption = { id: string; label: string };

type Props = {
  documents: SerializedDocument[];
  vehicles: VehicleOption[];
  defaultVehicleId?: string;
};

function formatFileSize(bytes: number, locale: string): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsLibrary({
  documents,
  vehicles,
  defaultVehicleId,
}: Props) {
  const t = useTranslations("documents");
  const tCat = useTranslations("documents.categories");
  const locale = useLocale();
  const [preview, setPreview] = useState<SerializedDocument | null>(null);
  const [uploadState, uploadAction, uploading] = useActionState<
    DocumentActionResult | null,
    FormData
  >(uploadDocumentAction, null);

  const errorKey = uploadState?.error;

  return (
    <div className="space-y-6">
      <form
        action={uploadAction}
        className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("uploadTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("uploadHint")}</p>
        </div>

        {errorKey ? (
          <Alert variant="error">
            {t(`errors.${errorKey}` as "errors.uploadFailed")}
          </Alert>
        ) : null}
        {uploadState?.ok ? <Alert variant="success">{t("uploadSuccess")}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doc-vehicle" required>
              {t("vehicle")}
            </Label>
            <Select
              id="doc-vehicle"
              name="vehicleId"
              required
              defaultValue={defaultVehicleId ?? ""}
            >
              <option value="">{t("selectVehicle")}</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-category">{t("category")}</Label>
            <Select id="doc-category" name="category" defaultValue="">
              <option value="">{t("categoryOptional")}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {tCat(cat)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="doc-title">{t("title")}</Label>
            <Input id="doc-title" name="title" placeholder={t("titlePlaceholder")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="doc-file" required>
              {t("file")}
            </Label>
            <Input
              id="doc-file"
              name="file"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            />
            <p className="text-xs text-muted-foreground">{t("fileHint")}</p>
          </div>
        </div>

        <Button type="submit" disabled={uploading || vehicles.length === 0}>
          {uploading ? t("uploading") : t("upload")}
        </Button>
      </form>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <article
              key={doc.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {doc.title || doc.originalFilename}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {doc.vehicleName ?? "—"}
                  {doc.category ? ` · ${tCat(doc.category)}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleDateString()}
                  {" · "}
                  {formatFileSize(doc.sizeBytes, locale)}
                  {" · "}
                  {doc.originalFilename}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {doc.isViewable ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => setPreview(doc)}
                  >
                    {t("view")}
                  </Button>
                ) : null}
                <a
                  href={getDocumentUrl(doc.id, true)}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  {t("download")}
                </a>
                <form action={deleteDocumentFormAction.bind(null, doc.id, doc.vehicleId)}>
                  <Button type="submit" variant="ghost" className="px-3 py-1.5 text-xs">
                    {t("delete")}
                  </Button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={preview != null}
        title={preview?.title || preview?.originalFilename || t("preview")}
        onClose={() => setPreview(null)}
        size="xl"
      >
        {preview ? (
          <div className="space-y-3">
            {preview.mimeType === "application/pdf" ? (
              <iframe
                src={getDocumentUrl(preview.id)}
                title={preview.originalFilename}
                className="h-[70vh] w-full rounded-lg border border-border"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getDocumentUrl(preview.id)}
                alt={preview.originalFilename}
                className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg"
              />
            )}
            <div className="flex justify-end gap-2">
              <a
                href={getDocumentUrl(preview.id, true)}
                className="inline-flex rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {t("download")}
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

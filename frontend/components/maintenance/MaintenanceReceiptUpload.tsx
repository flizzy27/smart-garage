"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  uploadDocumentAction,
  type DocumentActionResult,
} from "@/lib/actions/documents";

type RecordOption = {
  id: string;
  label: string;
};

type Props = {
  vehicleId: string;
  records: RecordOption[];
};

export function MaintenanceReceiptUpload({ vehicleId, records }: Props) {
  const t = useTranslations("maintenance.receipt");
  const [state, formAction, uploading] = useActionState<
    DocumentActionResult | null,
    FormData
  >(uploadDocumentAction, null);

  if (records.length === 0) return null;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("hint")}</p>
      </div>

      {state?.error ? <Alert variant="error">{t(`errors.${state.error}` as "errors.uploadFailed")}</Alert> : null}
      {state?.ok ? <Alert variant="success">{t("success")}</Alert> : null}

      <input type="hidden" name="vehicleId" value={vehicleId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="receipt-record" required>
            {t("service")}
          </Label>
          <Select id="receipt-record" name="maintenanceRecordId" required defaultValue={records[0]?.id}>
            {records.map((record) => (
              <option key={record.id} value={record.id}>
                {record.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="receipt-file" required>
            {t("file")}
          </Label>
          <Input id="receipt-file" name="file" type="file" accept=".pdf,image/*" required />
        </div>
      </div>

      <Button type="submit" disabled={uploading}>
        {uploading ? t("uploading") : t("upload")}
      </Button>
    </form>
  );
}

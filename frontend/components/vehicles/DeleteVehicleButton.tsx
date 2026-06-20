"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { deleteVehicleAction } from "@/lib/actions/vehicles";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Alert } from "@/components/ui/Alert";
import type { SerializedVehicle } from "@/lib/vehicles/serialize";
import { getVehicleDisplayName } from "@/lib/vehicles/serialize";

type DeleteVehicleButtonProps = {
  vehicle: SerializedVehicle;
};

export function DeleteVehicleButton({ vehicle }: DeleteVehicleButtonProps) {
  const t = useTranslations("vehicles.delete");
  const tErrors = useTranslations("vehicles.errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const vehicleName = getVehicleDisplayName(vehicle);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteVehicleAction(vehicle.id);
      if (!result.success) {
        const code = result.error?.code ?? "unknown";
        setError(
          tErrors.has(code as never) ? tErrors(code as never) : tErrors("unknown"),
        );
        return;
      }
      setOpen(false);
      router.push("/vehicles");
    });
  };

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        {t("button")}
      </Button>
      <Dialog
        open={open}
        title={t("title")}
        description={t("description", { name: vehicleName })}
        confirmLabel={pending ? t("deleting") : t("confirm")}
        cancelLabel={t("cancel")}
        confirmVariant="danger"
        loading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      >
        {error ? <Alert>{error}</Alert> : null}
      </Dialog>
    </>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/regional/format";
import {
  createWishlistAction,
  deleteWishlistAction,
  updateWishlistStatusAction,
} from "@/lib/actions/wishlist";
import type { WishlistCategory, WishlistStatus } from "@prisma/client";

export type WishlistItemView = {
  id: string;
  title: string;
  description: string | null;
  category: WishlistCategory;
  status: WishlistStatus;
  plannedMake: string | null;
  plannedModel: string | null;
  plannedYear: number | null;
  plannedBudgetCents: number | null;
  estimatedCostCents: number | null;
  currency: string;
  targetDate: string | null;
  url: string | null;
};

export function WishlistBoard({
  items,
  locale,
}: {
  items: WishlistItemView[];
  locale: string;
}) {
  const t = useTranslations("wishlist");
  const router = useRouter();
  const [state, action, pending] = useActionState(createWishlistAction, null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">{t("addTitle")}</h2>
        </CardHeader>
        <CardContent>
          {state?.error ? (
            <Alert variant="error">{t(`errors.${state.error}` as "errors.unknown")}</Alert>
          ) : null}
          <form action={action} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="wl-title" required>{t("itemTitle")}</Label>
              <Input id="wl-title" name="title" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wl-category">{t("category")}</Label>
              <Select id="wl-category" name="category" defaultValue="VEHICLE">
                <option value="VEHICLE">{t("categories.VEHICLE")}</option>
                <option value="PART">{t("categories.PART")}</option>
                <option value="ACCESSORY">{t("categories.ACCESSORY")}</option>
                <option value="OTHER">{t("categories.OTHER")}</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wl-status">{t("status")}</Label>
              <Select id="wl-status" name="status" defaultValue="IDEA">
                <option value="IDEA">{t("statuses.IDEA")}</option>
                <option value="PLANNED">{t("statuses.PLANNED")}</option>
                <option value="ORDERED">{t("statuses.ORDERED")}</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plannedMake">{t("plannedMake")}</Label>
              <Input id="plannedMake" name="plannedMake" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plannedModel">{t("plannedModel")}</Label>
              <Input id="plannedModel" name="plannedModel" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plannedBudgetEuros">{t("budget")}</Label>
              <Input id="plannedBudgetEuros" name="plannedBudgetEuros" type="number" min={0} step={0.01} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="targetDate">{t("targetDate")}</Label>
              <Input id="targetDate" name="targetDate" type="date" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="wl-desc">{t("description")}</Label>
              <Textarea id="wl-desc" name="description" rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? t("saving") : t("add")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground md:col-span-2">{t("empty")}</p>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    {(item.plannedMake || item.plannedModel) && (
                      <p className="text-sm text-muted-foreground">
                        {[item.plannedMake, item.plannedModel, item.plannedYear]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    )}
                  </div>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    {t(`statuses.${item.status}`)}
                  </span>
                </div>
                {item.description ? (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                ) : null}
                {item.plannedBudgetCents != null ? (
                  <p className="text-sm tabular-nums">
                    {t("budget")}:{" "}
                    {formatCurrency(item.plannedBudgetCents, item.currency, locale)}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {(["IDEA", "PLANNED", "ORDERED", "DONE"] as WishlistStatus[]).map(
                    (status) =>
                      status !== item.status ? (
                        <Button
                          key={status}
                          type="button"
                          variant="ghost"
                          className="px-3 py-1.5 text-xs"
                          onClick={() =>
                            void updateWishlistStatusAction(item.id, status).then(() =>
                              router.refresh(),
                            )
                          }
                        >
                          → {t(`statuses.${status}`)}
                        </Button>
                      ) : null,
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-1.5 text-xs"
                    onClick={() =>
                      void deleteWishlistAction(item.id).then(() => router.refresh())
                    }
                  >
                    {t("delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  createExpenseAction,
  deleteExpenseAction,
  type ExpenseActionResult,
} from "@/lib/actions/expenses";
import { formatEuros } from "@/lib/money";
import type { SerializedExpense } from "@/lib/repositories/expenses";

const CATEGORIES = [
  "MAINTENANCE",
  "FUEL",
  "INSURANCE",
  "TAX",
  "REGISTRATION",
  "REPAIR",
  "ACCESSORY",
  "OTHER",
] as const;

type VehicleOption = { id: string; label: string };

type Props = {
  expenses: SerializedExpense[];
  vehicles: VehicleOption[];
  defaultVehicleId?: string;
};

export function ExpensesLibrary({
  expenses,
  vehicles,
  defaultVehicleId,
}: Props) {
  const t = useTranslations("expenses");
  const locale = useLocale();
  const [createState, createAction, creating] = useActionState<
    ExpenseActionResult | null,
    FormData
  >(createExpenseAction, null);
  const [deleteState, deleteAction] = useActionState<
    ExpenseActionResult | null,
    FormData
  >(deleteExpenseAction, null);

  return (
    <div className="space-y-6">
      <form
        action={createAction}
        className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("addTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("addHint")}</p>
        </div>

        {createState?.error ? <Alert variant="error">{createState.error}</Alert> : null}
        {createState?.ok ? <Alert variant="success">{t("added")}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exp-vehicle" required>
              {t("vehicle")}
            </Label>
            <Select
              id="exp-vehicle"
              name="vehicleId"
              required
              defaultValue={defaultVehicleId ?? vehicles[0]?.id ?? ""}
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-category" required>
              {t("category")}
            </Label>
            <Select id="exp-category" name="category" defaultValue="OTHER">
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-date" required>
              {t("date")}
            </Label>
            <Input
              id="exp-date"
              name="occurredAt"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-amount" required>
              {t("amount")}
            </Label>
            <Input
              id="exp-amount"
              name="amountEuros"
              type="number"
              min={0}
              step="0.01"
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="exp-desc">{t("description")}</Label>
            <Textarea id="exp-desc" name="description" rows={2} />
          </div>
        </div>
        <Button type="submit" disabled={creating}>
          {creating ? t("saving") : t("save")}
        </Button>
      </form>

      {deleteState?.ok ? <Alert variant="success">{t("deleted")}</Alert> : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("listTitle")}</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {expense.description || t(`categories.${expense.category}`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {expense.vehicleName} ·{" "}
                    {new Date(expense.occurredAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatEuros(expense.amountCents, locale, expense.currency)}
                  </span>
                  <form action={deleteAction}>
                    <input type="hidden" name="expenseId" value={expense.id} />
                    <Button type="submit" variant="ghost" className="h-8 px-2 text-xs">
                      {t("delete")}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

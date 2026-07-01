"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { MaintenanceItemCategory, MaintenanceItemUnit } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  MAINTENANCE_ITEM_CATEGORIES,
  MAINTENANCE_ITEM_UNITS,
  defaultUnitForCategory,
  getItemSuggestions,
} from "@/lib/maintenance/item-categories";
import type { SerializedMaintenanceItem } from "@/lib/repositories/maintenance-items";

export type EditableMaintenanceItem = {
  key: string;
  category: MaintenanceItemCategory;
  name: string;
  brand: string;
  productName: string;
  partNumber: string;
  specification: string;
  quantity: string;
  unit: MaintenanceItemUnit | "";
  customUnit: string;
  costEuros: string;
  supplierName: string;
  notes: string;
};

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `item-${Date.now()}-${keySeq}`;
}

export function emptyItem(category: MaintenanceItemCategory = "OTHER"): EditableMaintenanceItem {
  return {
    key: nextKey(),
    category,
    name: "",
    brand: "",
    productName: "",
    partNumber: "",
    specification: "",
    quantity: "",
    unit: defaultUnitForCategory(category),
    customUnit: "",
    costEuros: "",
    supplierName: "",
    notes: "",
  };
}

export function itemsFromSerialized(
  items: SerializedMaintenanceItem[],
): EditableMaintenanceItem[] {
  return items.map((item) => ({
    key: nextKey(),
    category: item.category,
    name: item.name ?? "",
    brand: item.brand ?? "",
    productName: item.productName ?? "",
    partNumber: item.partNumber ?? "",
    specification: item.specification ?? "",
    quantity: item.quantity != null ? String(item.quantity) : "",
    unit: item.unit ?? "",
    customUnit: item.customUnit ?? "",
    costEuros: item.costCents != null ? (item.costCents / 100).toFixed(2) : "",
    supplierName: item.supplierName ?? "",
    notes: item.notes ?? "",
  }));
}

export function itemsToJson(items: EditableMaintenanceItem[]): string {
  const payload = items.map((item) => ({
    category: item.category,
    name: item.name.trim() || null,
    brand: item.brand.trim() || null,
    productName: item.productName.trim() || null,
    partNumber: item.partNumber.trim() || null,
    specification: item.specification.trim() || null,
    quantity: item.quantity.trim() ? Number(item.quantity) : null,
    unit: item.unit || null,
    customUnit: item.unit === "CUSTOM" ? item.customUnit.trim() || null : null,
    costCents: item.costEuros.trim() ? Math.round(Number(item.costEuros) * 100) : null,
    currency: null,
    supplierName: item.supplierName.trim() || null,
    notes: item.notes.trim() || null,
  }));
  return JSON.stringify(payload);
}

type MaintenanceItemsEditorProps = {
  items: EditableMaintenanceItem[];
  onChange: (items: EditableMaintenanceItem[]) => void;
  suggestedCategories?: MaintenanceItemCategory[];
  hiddenInputName?: string;
  idPrefix?: string;
};

export function MaintenanceItemsEditor({
  items,
  onChange,
  suggestedCategories = [],
  hiddenInputName = "itemsJson",
  idPrefix = "item",
}: MaintenanceItemsEditorProps) {
  const t = useTranslations("maintenance.items");
  const reactId = useId();
  const [pickerCategory, setPickerCategory] = useState<MaintenanceItemCategory>(
    suggestedCategories[0] ?? "OTHER",
  );

  const jsonValue = useMemo(() => itemsToJson(items), [items]);

  function updateItem(key: string, patch: Partial<EditableMaintenanceItem>) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function removeItem(key: string) {
    onChange(items.filter((item) => item.key !== key));
  }

  function addItem(category: MaintenanceItemCategory) {
    onChange([...items, emptyItem(category)]);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={hiddenInputName} value={jsonValue} />

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const suggestions = getItemSuggestions(item.category);
            const brandListId = `${idPrefix}-${reactId}-${index}-brand-list`;
            const specListId = `${idPrefix}-${reactId}-${index}-spec-list`;
            return (
            <div
              key={item.key}
              className="space-y-3 rounded-lg border border-border-subtle bg-muted/30 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor={`${idPrefix}-${reactId}-${index}-category`}>
                    {t("category")}
                  </Label>
                  <Select
                    id={`${idPrefix}-${reactId}-${index}-category`}
                    value={item.category}
                    onChange={(e) => {
                      const category = e.target.value as MaintenanceItemCategory;
                      updateItem(item.key, {
                        category,
                        unit: item.unit || defaultUnitForCategory(category),
                      });
                    }}
                  >
                    {MAINTENANCE_ITEM_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {t(`categories.${category}`)}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-6 shrink-0 px-2 py-1.5 text-xs text-danger hover:bg-danger/10"
                  onClick={() => removeItem(item.key)}
                  aria-label={t("remove")}
                >
                  {t("remove")}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-${reactId}-${index}-name`}>{t("name")}</Label>
                  <Input
                    id={`${idPrefix}-${reactId}-${index}-name`}
                    value={item.name}
                    placeholder={t("namePlaceholder")}
                    onChange={(e) => updateItem(item.key, { name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-${reactId}-${index}-brand`}>{t("brand")}</Label>
                  <Input
                    id={`${idPrefix}-${reactId}-${index}-brand`}
                    value={item.brand}
                    placeholder="Mann Filter, Motul, NGK…"
                    list={suggestions.brands ? brandListId : undefined}
                    onChange={(e) => updateItem(item.key, { brand: e.target.value })}
                  />
                  {suggestions.brands ? (
                    <datalist id={brandListId}>
                      {suggestions.brands.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-${reactId}-${index}-product`}>
                    {t("productName")}
                  </Label>
                  <Input
                    id={`${idPrefix}-${reactId}-${index}-product`}
                    value={item.productName}
                    placeholder="8100 Power 5W-40"
                    onChange={(e) => updateItem(item.key, { productName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-${reactId}-${index}-part`}>
                    {t("partNumber")}
                  </Label>
                  <Input
                    id={`${idPrefix}-${reactId}-${index}-part`}
                    value={item.partNumber}
                    placeholder="HU 6002 z"
                    onChange={(e) => updateItem(item.key, { partNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-${reactId}-${index}-spec`}>
                    {t("specification")}
                  </Label>
                  <Input
                    id={`${idPrefix}-${reactId}-${index}-spec`}
                    value={item.specification}
                    placeholder="5W-40, DOT 4…"
                    list={suggestions.specs ? specListId : undefined}
                    onChange={(e) => updateItem(item.key, { specification: e.target.value })}
                  />
                  {suggestions.specs ? (
                    <datalist id={specListId}>
                      {suggestions.specs.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-${reactId}-${index}-qty`}>
                      {t("quantity")}
                    </Label>
                    <Input
                      id={`${idPrefix}-${reactId}-${index}-qty`}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-${reactId}-${index}-unit`}>{t("unit")}</Label>
                    <Select
                      id={`${idPrefix}-${reactId}-${index}-unit`}
                      value={item.unit}
                      onChange={(e) =>
                        updateItem(item.key, { unit: e.target.value as MaintenanceItemUnit | "" })
                      }
                    >
                      <option value="">—</option>
                      {MAINTENANCE_ITEM_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {t(`units.${unit}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                {item.unit === "CUSTOM" ? (
                  <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-${reactId}-${index}-customUnit`}>
                      {t("customUnit")}
                    </Label>
                    <Input
                      id={`${idPrefix}-${reactId}-${index}-customUnit`}
                      value={item.customUnit}
                      onChange={(e) => updateItem(item.key, { customUnit: e.target.value })}
                    />
                  </div>
                ) : null}
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-${reactId}-${index}-cost`}>{t("cost")}</Label>
                  <Input
                    id={`${idPrefix}-${reactId}-${index}-cost`}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={item.costEuros}
                    onChange={(e) => updateItem(item.key, { costEuros: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-${reactId}-${index}-supplier`}>
                    {t("supplier")}
                  </Label>
                  <Input
                    id={`${idPrefix}-${reactId}-${index}-supplier`}
                    value={item.supplierName}
                    onChange={(e) => updateItem(item.key, { supplierName: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`${idPrefix}-${reactId}-${index}-notes`}>{t("itemNotes")}</Label>
                  <Textarea
                    id={`${idPrefix}-${reactId}-${index}-notes`}
                    rows={2}
                    value={item.notes}
                    onChange={(e) => updateItem(item.key, { notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {suggestedCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => addItem(category)}
            className="min-h-[36px] rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
          >
            + {t(`categories.${category}`)}
          </button>
        ))}

        <div className="flex items-center gap-2">
          <Select
            className="min-h-[36px] w-auto py-1.5 text-xs"
            value={pickerCategory}
            onChange={(e) => setPickerCategory(e.target.value as MaintenanceItemCategory)}
            aria-label={t("addCustomItem")}
          >
            {MAINTENANCE_ITEM_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[36px] px-3 py-1.5 text-xs"
            onClick={() => addItem(pickerCategory)}
          >
            + {t("addItem")}
          </Button>
        </div>
      </div>
    </div>
  );
}

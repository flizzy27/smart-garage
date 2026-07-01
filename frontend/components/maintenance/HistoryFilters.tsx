"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useRouter } from "@/lib/i18n/navigation";

const CATEGORY_KEYS = [
  "ENGINE",
  "FILTERS",
  "FLUIDS",
  "BRAKES",
  "TIRES",
  "INSPECTION",
  "ADDITIVE",
  "OTHER",
];

type HistoryFiltersProps = {
  vehicles: { id: string; name: string }[];
};

export function HistoryFilters({ vehicles }: HistoryFiltersProps) {
  const t = useTranslations("history.filters");
  const tCategories = useTranslations("maintenance.categories");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`/history?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", search);
  }

  const hasFilters =
    searchParams.get("search") ||
    searchParams.get("vehicleId") ||
    searchParams.get("category") ||
    searchParams.get("fromDate") ||
    searchParams.get("toDate");

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
        />
        <Button type="submit" variant="secondary" className="shrink-0 px-3">
          {t("search")}
        </Button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("vehicle")}</label>
          <Select
            value={searchParams.get("vehicleId") ?? ""}
            onChange={(e) => updateParam("vehicleId", e.target.value)}
          >
            <option value="">{t("allVehicles")}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("category")}</label>
          <Select
            value={searchParams.get("category") ?? ""}
            onChange={(e) => updateParam("category", e.target.value)}
          >
            <option value="">{t("allCategories")}</option>
            {CATEGORY_KEYS.map((category) => (
              <option key={category} value={category}>
                {tCategories(category)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("fromDate")}</label>
          <Input
            type="date"
            value={searchParams.get("fromDate") ?? ""}
            onChange={(e) => updateParam("fromDate", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("toDate")}</label>
          <Input
            type="date"
            value={searchParams.get("toDate") ?? ""}
            onChange={(e) => updateParam("toDate", e.target.value)}
          />
        </div>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            router.push("/history");
          }}
          className="text-xs font-medium text-accent hover:underline"
          disabled={isPending}
        >
          {t("clearFilters")}
        </button>
      ) : null}
    </div>
  );
}

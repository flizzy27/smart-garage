"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useRouter } from "@/lib/i18n/navigation";

type NotesFiltersProps = {
  vehicles: { id: string; name: string }[];
  tags: string[];
};

export function NotesFilters({ vehicles, tags }: NotesFiltersProps) {
  const t = useTranslations("notes.filters");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`/notes?${params.toString()}`);
    });
  }

  const pinnedOnly = searchParams.get("pinnedOnly") === "true";
  const hasFilters =
    searchParams.get("search") ||
    searchParams.get("vehicleId") ||
    searchParams.get("tag") ||
    pinnedOnly;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParam("search", search);
        }}
        className="flex gap-2"
      >
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

      <div className="grid gap-3 sm:grid-cols-3">
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
          <label className="text-xs font-medium text-muted-foreground">{t("tag")}</label>
          <Select
            value={searchParams.get("tag") ?? ""}
            onChange={(e) => updateParam("tag", e.target.value)}
          >
            <option value="">{t("allTags")}</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={pinnedOnly}
            onChange={(e) => updateParam("pinnedOnly", e.target.checked ? "true" : "")}
            className="h-4 w-4 rounded border-border accent-[var(--accent)]"
          />
          {t("pinnedOnly")}
        </label>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            router.push("/notes");
          }}
          className="text-xs font-medium text-accent hover:underline"
        >
          {t("clearFilters")}
        </button>
      ) : null}
    </div>
  );
}

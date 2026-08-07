"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export type PlaceHit = { label: string; lat: number; lng: number };

type Props = {
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onPick: (hit: PlaceHit) => void;
  /** Rendered under the field once a place has been chosen. */
  selectedLabel?: string | null;
  searchingLabel: string;
  noResultsLabel: string;
  disabled?: boolean;
};

/** Typing "zand" should not fire four searches — wait for a pause first. */
const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

/**
 * Type-ahead place search backed by OpenStreetMap's Nominatim, proxied through
 * our own geocode endpoint.
 *
 * Nominatim asks for at most one request per second, so the input is debounced
 * and short queries never leave the browser. Results are also cached
 * server-side, which makes going back to a previous query instant.
 */
export function LocationAutocomplete({
  label,
  placeholder,
  value,
  onValueChange,
  onPick,
  selectedLabel,
  searchingLabel,
  noResultsLabel,
  disabled = false,
}: Props) {
  const inputId = useId();
  const listId = `${inputId}-list`;

  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  /** Guards against an earlier, slower query overwriting a later one. */
  const queryIdRef = useRef(0);
  /** Set when a pick fills the field, so the refill does not re-search. */
  const skipNextSearchRef = useRef(false);

  const runSearch = useCallback(async (query: string) => {
    const queryId = ++queryIdRef.current;
    setSearching(true);

    try {
      const url = new URL("/api/fuel-prices/geocode", window.location.origin);
      url.searchParams.set("q", query);
      const response = await fetch(url);
      const body = (await response.json()) as { results?: PlaceHit[] };
      if (queryId !== queryIdRef.current) return;

      setHits(body.results ?? []);
      setOpen(true);
      setActiveIndex(-1);
    } catch {
      if (queryId !== queryIdRef.current) return;
      setHits([]);
    } finally {
      if (queryId === queryIdRef.current) {
        setSearching(false);
        setSearched(true);
      }
    }
  }, []);

  const query = value.trim();
  /**
   * Short queries are hidden by the render conditions below rather than by
   * clearing state — deriving beats an effect that exists only to reset things
   * back to their initial values.
   */
  const queryLongEnough = query.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (query.length < MIN_QUERY_LENGTH) return;

    const timer = setTimeout(() => void runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  // Clicking anywhere else closes the suggestions.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (hit: PlaceHit) => {
    skipNextSearchRef.current = true;
    onValueChange(hit.label);
    onPick(hit);
    setOpen(false);
    setHits([]);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || hits.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % hits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? hits.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0) {
        event.preventDefault();
        choose(hits[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>

      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={() => {
          if (hits.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="h-12 w-full rounded-xl border border-border bg-card px-3.5 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
      />

      {searching ? (
        <p className="text-[11px] text-muted-foreground">{searchingLabel}</p>
      ) : selectedLabel ? (
        <p className="truncate text-[11px] text-muted-foreground">
          {selectedLabel}
        </p>
      ) : searched && hits.length === 0 && queryLongEnough ? (
        <p className="text-[11px] text-muted-foreground">{noResultsLabel}</p>
      ) : null}

      {open && queryLongEnough && hits.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {hits.map((hit, index) => (
            <li key={`${hit.lat},${hit.lng}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onClick={() => choose(hit)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`block w-full px-3.5 py-2.5 text-left text-sm transition-colors ${
                  index === activeIndex
                    ? "bg-muted text-foreground"
                    : "text-foreground hover:bg-muted/60"
                }`}
              >
                {hit.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

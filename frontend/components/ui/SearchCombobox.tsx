"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Input } from "./Input";
import { Label } from "./Label";

export type ComboboxOption = {
  id: string;
  label: string;
  hint?: string;
};

type SearchComboboxProps = {
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  loadingMessage: string;
  fetchOptions: (query: string) => Promise<ComboboxOption[]>;
  initialOption?: ComboboxOption | null;
  onValueChange?: (option: ComboboxOption | null) => void;
};

export function SearchCombobox({
  name,
  label,
  required = false,
  disabled = false,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  loadingMessage,
  fetchOptions,
  initialOption = null,
  onValueChange,
}: SearchComboboxProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ComboboxOption | null>(
    initialOption,
  );
  const [highlightIndex, setHighlightIndex] = useState(0);

  const loadOptions = useCallback(
    async (search: string) => {
      setLoading(true);
      try {
        const results = await fetchOptions(search);
        setOptions(results);
        setHighlightIndex(0);
      } finally {
        setLoading(false);
      }
    },
    [fetchOptions],
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      void loadOptions(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [open, query, loadOptions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectOption = (option: ComboboxOption) => {
    setSelected(option);
    setQuery("");
    setOpen(false);
    onValueChange?.(option);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    onValueChange?.(null);
  };

  const displayValue = open
    ? query
    : selected?.label ?? "";

  return (
    <div ref={containerRef} className="relative space-y-2">
      <Label htmlFor={listId} required={required}>
        {label}
      </Label>
      <input type="hidden" name={name} value={selected?.id ?? ""} required={required} />
      <div className="relative">
        <Input
          id={listId}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={selected ? selected.label : placeholder}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
            if (selected) {
              setSelected(null);
              onValueChange?.(null);
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightIndex((i) => Math.min(i + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && open && options[highlightIndex]) {
              e.preventDefault();
              selectOption(options[highlightIndex]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {selected && !open ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={clearSelection}
            aria-label="Clear"
          >
            ×
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {loadingMessage}
            </p>
          ) : options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={index === highlightIndex}
                className={`flex w-full flex-col px-3 py-2 text-left text-sm transition-colors ${
                  index === highlightIndex
                    ? "bg-accent/10 text-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => selectOption(option)}
              >
                <span className="font-medium">{option.label}</span>
                {option.hint ? (
                  <span className="text-xs text-muted-foreground">
                    {option.hint}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
      {!open && !selected ? (
        <p className="text-xs text-muted-foreground">{searchPlaceholder}</p>
      ) : null}
    </div>
  );
}

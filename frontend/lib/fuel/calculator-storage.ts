import {
  createDefaultCalculatorValues,
  migrateCalculatorValues,
  sanitizeCalculatorValues,
  sanitizeSectionState,
  type CalculatorSectionState,
  type CalculatorUnits,
  type CalculatorValues,
} from "@/lib/fuel/calculator-state";
import {
  DISTANCE_UNIT_OPTIONS,
  VOLUME_UNIT_OPTIONS,
} from "@/lib/settings/types";

/**
 * The calculator is a scratchpad, not user data: it never touches the
 * database. Everything lives in `localStorage`, per device — the same choice
 * the quick-fuel widget makes for its open/closed state, and the reason a
 * phone can keep different draft numbers than the desktop next to it.
 */
const STORAGE_KEY = "smart-garage-fuel-calculator";
const STORAGE_VERSION = 1;

export type PersistedCalculator = {
  values: CalculatorValues;
  sections: CalculatorSectionState;
};

function sanitizeUnits(raw: unknown, fallback: CalculatorUnits): CalculatorUnits {
  if (raw == null || typeof raw !== "object") return fallback;
  const source = raw as Record<string, unknown>;
  const distanceUnit = DISTANCE_UNIT_OPTIONS.find(
    (unit) => unit === source.distanceUnit,
  );
  const volumeUnit = VOLUME_UNIT_OPTIONS.find(
    (unit) => unit === source.volumeUnit,
  );
  return {
    distanceUnit: distanceUnit ?? fallback.distanceUnit,
    volumeUnit: volumeUnit ?? fallback.volumeUnit,
  };
}

export function readCalculatorState(units: CalculatorUnits): PersistedCalculator {
  const empty: PersistedCalculator = {
    values: createDefaultCalculatorValues(units),
    sections: sanitizeSectionState(null),
  };

  if (typeof window === "undefined") return empty;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed?.version !== STORAGE_VERSION) return empty;

    const storedUnits = sanitizeUnits(parsed.units, units);
    return {
      // Sanitize first (the saved blob may predate a field), then convert the
      // numbers into whatever units the user reads today.
      values: migrateCalculatorValues(
        sanitizeCalculatorValues(parsed.values, storedUnits),
        storedUnits,
        units,
      ),
      sections: sanitizeSectionState(parsed.sections),
    };
  } catch {
    return empty;
  }
}

export function writeCalculatorState(
  state: PersistedCalculator,
  units: CalculatorUnits,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, units, ...state }),
    );
  } catch {
    // Private mode / quota — the calculator still works, it just forgets.
  }
}

export function clearCalculatorState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

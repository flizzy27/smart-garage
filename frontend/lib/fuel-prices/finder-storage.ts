import {
  DEFAULT_FINDER_STATE,
  sanitizeFinderState,
  type FinderState,
} from "@/lib/fuel-prices/finder-state";

/**
 * Per-device persistence for the station finder, mirroring the fuel
 * calculator: a scratchpad in `localStorage`, never a database write.
 *
 * The saved location is a convenience so the page is useful the moment it
 * opens; it stays on the device and is never sent anywhere except to the
 * app's own station lookup.
 */
const STORAGE_KEY = "smart-garage-fuel-stations";
const STORAGE_VERSION = 1;

export function readFinderState(): FinderState {
  if (typeof window === "undefined") return DEFAULT_FINDER_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FINDER_STATE;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed?.version !== STORAGE_VERSION) return DEFAULT_FINDER_STATE;

    return sanitizeFinderState(parsed.state);
  } catch {
    return DEFAULT_FINDER_STATE;
  }
}

export function writeFinderState(state: FinderState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, state }),
    );
  } catch {
    // Private mode or a full quota — the finder still works, it just forgets.
  }
}

import type { MaintenanceDueStatus } from "@prisma/client";

/**
 * Single source of truth for maintenance status colors across the app.
 *
 * Status → semantic color:
 *   OVERDUE  → red    (danger)
 *   DUE_SOON → yellow (warning)
 *   OK       → green  (success)
 *
 * Keeping every card, badge, table, dashboard widget and reminder on the same
 * lookup tables guarantees the status color language stays consistent everywhere.
 */

export type MaintenanceStatusTone = "danger" | "warning" | "success";

export const MAINTENANCE_STATUS_TONE: Record<
  MaintenanceDueStatus,
  MaintenanceStatusTone
> = {
  OVERDUE: "danger",
  DUE_SOON: "warning",
  OK: "success",
};

/** Card / row wrapper: colored border + subtle tinted background. */
export const MAINTENANCE_STATUS_CARD_CLASS: Record<MaintenanceDueStatus, string> = {
  OVERDUE: "border-danger/40 bg-danger-muted/30",
  DUE_SOON: "border-warning/40 bg-warning-muted/20",
  OK: "border-border bg-card",
};

/** Standalone status text color (for labels like "Overdue"). */
export const MAINTENANCE_STATUS_TEXT_CLASS: Record<MaintenanceDueStatus, string> = {
  OVERDUE: "text-danger",
  DUE_SOON: "text-warning",
  OK: "text-success",
};

/** Soft pill / chip badge (tinted background + matching text + ring). */
export const MAINTENANCE_STATUS_BADGE_CLASS: Record<MaintenanceDueStatus, string> = {
  OVERDUE: "bg-danger-muted text-danger ring-1 ring-danger/20",
  DUE_SOON: "bg-warning-muted text-warning ring-1 ring-warning/20",
  OK: "bg-success-muted text-success ring-1 ring-success/20",
};

/** Solid high-contrast badge (e.g. floating over a vehicle photo). */
export const MAINTENANCE_STATUS_SOLID_CLASS: Record<MaintenanceDueStatus, string> = {
  OVERDUE: "bg-danger text-white",
  DUE_SOON: "bg-warning text-white",
  OK: "bg-success text-white",
};

/** Sort weight — most urgent first. */
export const MAINTENANCE_STATUS_ORDER: Record<MaintenanceDueStatus, number> = {
  OVERDUE: 0,
  DUE_SOON: 1,
  OK: 2,
};

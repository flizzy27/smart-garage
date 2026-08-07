import type { ComponentType } from "react";
import {
  IconCalculator,
  IconDashboard,
  IconDocuments,
  IconExpenses,
  IconFuelPrices,
  IconHistory,
  IconMaintenance,
  IconNotes,
  IconReminders,
  IconSettings,
  IconVehicles,
} from "@/components/layout/NavIcons";

export type NavItem = {
  href: string;
  labelKey:
    | "dashboard"
    | "vehicles"
    | "maintenance"
    | "history"
    | "documents"
    | "notes"
    | "expenses"
    | "costs"
    | "fuel"
    | "fuelCalculator"
    | "fuelPrices"
    | "odometer"
    | "wishlist"
    | "reminders"
    | "settings";
  icon: ComponentType<{ className?: string }>;
};

export type NavGroup = {
  labelKey: "overview" | "fleet" | "finance";
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    labelKey: "overview",
    items: [{ href: "/", labelKey: "dashboard", icon: IconDashboard }],
  },
  {
    labelKey: "fleet",
    items: [
      { href: "/vehicles", labelKey: "vehicles", icon: IconVehicles },
      { href: "/maintenance", labelKey: "maintenance", icon: IconMaintenance },
      { href: "/odometer", labelKey: "odometer", icon: IconHistory },
      { href: "/history", labelKey: "history", icon: IconHistory },
      { href: "/documents", labelKey: "documents", icon: IconDocuments },
      { href: "/notes", labelKey: "notes", icon: IconNotes },
    ],
  },
  {
    labelKey: "finance",
    items: [
      { href: "/costs", labelKey: "costs", icon: IconExpenses },
      { href: "/expenses", labelKey: "expenses", icon: IconExpenses },
      { href: "/fuel", labelKey: "fuel", icon: IconExpenses },
      {
        href: "/fuel-calculator",
        labelKey: "fuelCalculator",
        icon: IconCalculator,
      },
      { href: "/fuel-prices", labelKey: "fuelPrices", icon: IconFuelPrices },
      { href: "/wishlist", labelKey: "wishlist", icon: IconVehicles },
      { href: "/reminders", labelKey: "reminders", icon: IconReminders },
    ],
  },
];

export const settingsNavItem: NavItem = {
  href: "/settings",
  labelKey: "settings",
  icon: IconSettings,
};

/** @deprecated Use navGroups — kept for any external references */
export const mainNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

import type { ReactNode } from "react";
import { SettingsNav } from "./SettingsNav";

export function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <SettingsNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

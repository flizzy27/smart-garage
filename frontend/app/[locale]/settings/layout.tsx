import type { ReactNode } from "react";
import { SettingsShell } from "@/components/settings/SettingsShell";

type Props = {
  children: ReactNode;
};

export default function SettingsLayout({ children }: Props) {

  return (
    <div className="mx-auto w-full max-w-5xl">
      <SettingsShell>{children}</SettingsShell>
    </div>
  );
}

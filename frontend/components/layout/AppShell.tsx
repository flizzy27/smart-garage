"use client";

import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { SidebarProvider } from "./SidebarContext";
import { PageBackground } from "@/components/theme/PageBackground";
import { useAppearance } from "@/providers/AppearanceProvider";

export function AppShell({
  children,
  hasBackground = false,
}: {
  children: React.ReactNode;
  hasBackground?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { blurStyle } = useAppearance();

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen">
        <PageBackground enabled={hasBackground} />
        <div className="relative z-10 flex min-h-screen w-full">
          <Sidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            translucent={hasBackground}
            blurStyle={blurStyle}
          />
          <div
            className={`flex min-w-0 flex-1 flex-col ${hasBackground ? "bg-surface/88" : "bg-surface"}`}
            style={hasBackground ? blurStyle : undefined}
          >
            <Header onMenuOpen={() => setMobileOpen(true)} blurStyle={hasBackground ? blurStyle : undefined} />
            <main className="safe-pb safe-pl safe-pr flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

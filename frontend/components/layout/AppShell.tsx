"use client";

import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { SidebarProvider } from "./SidebarContext";
import { PageBackground } from "@/components/theme/PageBackground";

export function AppShell({
  children,
  hasBackground = false,
}: {
  children: React.ReactNode;
  hasBackground?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen">
        <PageBackground enabled={hasBackground} />
        <div className="relative z-10 flex min-h-screen w-full">
          <Sidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            translucent={hasBackground}
          />
          <div
            className={`flex min-w-0 flex-1 flex-col ${hasBackground ? "bg-surface/88 backdrop-blur-sm" : "bg-surface"}`}
          >
            <Header onMenuOpen={() => setMobileOpen(true)} />
            <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

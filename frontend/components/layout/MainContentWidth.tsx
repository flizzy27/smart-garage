"use client";

import type { ReactNode } from "react";
import { useSidebar } from "@/components/layout/SidebarContext";

type Props = {
  children: ReactNode;
  className?: string;
};

export function MainContentWidth({ children, className = "" }: Props) {
  const { collapsed } = useSidebar();

  return (
    <div
      className={`mx-auto w-full transition-[max-width] duration-200 ${
        collapsed ? "max-w-[88rem]" : "max-w-6xl"
      } ${className}`}
    >
      {children}
    </div>
  );
}

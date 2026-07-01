"use client";

import { useTranslations } from "next-intl";
import { SidebarNav } from "./SidebarNav";
import { IconChevronLeft, IconChevronRight, IconClose } from "./NavIcons";
import { UserSessionBar } from "@/components/auth/UserSessionBar";
import { AppLogo } from "@/components/brand/AppLogo";
import { useSidebar } from "./SidebarContext";
import { useAppearance } from "@/providers/AppearanceProvider";

type SidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
  translucent?: boolean;
  blurStyle?: React.CSSProperties;
};

export function Sidebar({ mobileOpen, onMobileClose, translucent = false, blurStyle }: SidebarProps) {
  const t = useTranslations("app");
  const tNav = useTranslations("nav");
  const { collapsed, toggleCollapsed } = useSidebar();
  const { designPreset } = useAppearance();

  const sidebarBg = translucent ? "bg-sidebar/92" : "bg-sidebar";
  const hasGradient = designPreset !== "default";

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={`group/sidebar safe-pt safe-pb safe-pl fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-sidebar-border ${sidebarBg} transition-[width,transform] duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          collapsed ? "w-[4.5rem]" : "w-64"
        } ${
          mobileOpen
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0"
        }`}
        style={translucent ? blurStyle : undefined}
      >
        {hasGradient ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
            style={{ background: "var(--sidebar-gradient, linear-gradient(90deg, var(--accent), transparent))" }}
            aria-hidden
          />
        ) : null}
        <div
          className={`relative flex h-14 shrink-0 items-center border-b border-sidebar-border ${
            collapsed ? "justify-center px-2" : "justify-between gap-3 px-4"
          }`}
          style={
            hasGradient
              ? {
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, transparent), transparent)",
                }
              : undefined
          }
        >
          <AppLogo
            name={t("name")}
            href="/"
            onClick={onMobileClose}
            showName={!collapsed}
            size={collapsed ? "sm" : "md"}
          />
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            onClick={onMobileClose}
            aria-label={tNav("closeMenu")}
          >
            <IconClose />
          </button>

          <button
            type="button"
            onClick={toggleCollapsed}
            className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground lg:inline-flex"
            aria-label={collapsed ? tNav("expandSidebar") : tNav("collapseSidebar")}
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
        </div>

        <SidebarNav collapsed={collapsed} onNavigate={onMobileClose} />
        <UserSessionBar collapsed={collapsed} />

        {!collapsed ? (
          <div className="hidden border-t border-sidebar-border px-4 py-3 lg:block">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("version")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("creator")} <span className="font-semibold text-foreground">Flizzy</span>
            </p>
          </div>
        ) : null}
      </aside>
    </>
  );
}

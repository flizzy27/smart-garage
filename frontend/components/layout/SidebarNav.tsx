"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { navGroups, settingsNavItem } from "@/lib/navigation";

type SidebarNavProps = {
  onNavigate?: () => void;
  collapsed?: boolean;
};

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center rounded-lg text-[13px] font-medium transition-colors ${
        collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2"
      } ${
        isActive
          ? "bg-sidebar-active text-sidebar-active-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-muted/80 hover:text-foreground"
      }`}
    >
      {isActive && !collapsed ? (
        <span
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
          aria-hidden
        />
      ) : null}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"}`}
      />
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  );
}

export function SidebarNav({ onNavigate, collapsed = false }: SidebarNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div
      className={`flex flex-1 flex-col overflow-y-auto py-3 ${collapsed ? "px-2" : "px-3"}`}
    >
      {navGroups.map((group) => (
        <div key={group.labelKey} className="mb-4 last:mb-0">
          {!collapsed ? (
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
              {t(`groups.${group.labelKey}`)}
            </p>
          ) : null}
          <nav className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={t(item.labelKey)}
                icon={item.icon}
                isActive={isActive(item.href)}
                onNavigate={onNavigate}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </div>
      ))}

      <div className="mt-auto border-t border-sidebar-border pt-3">
        <NavLink
          href={settingsNavItem.href}
          label={t(settingsNavItem.labelKey)}
          icon={settingsNavItem.icon}
          isActive={isActive(settingsNavItem.href)}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      </div>
    </div>
  );
}

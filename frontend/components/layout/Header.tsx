"use client";

import { useTranslations } from "next-intl";
import { HeaderDateTime } from "./HeaderDateTime";
import { IconMenu } from "./NavIcons";
import { useAppearance } from "@/providers/AppearanceProvider";

type HeaderProps = {
  onMenuOpen: () => void;
  blurStyle?: React.CSSProperties;
};

export function Header({ onMenuOpen, blurStyle }: HeaderProps) {
  const tNav = useTranslations("nav");
  const { designPreset } = useAppearance();

  return (
    <header
      className="relative sticky top-0 z-30 flex h-14 w-full shrink-0 items-center border-b border-border bg-surface/90 px-4 sm:px-6"
      style={{
        ...blurStyle,
        ...(designPreset !== "default"
          ? {
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface))",
            }
          : {}),
      }}
    >
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground shadow-sm transition-colors hover:bg-muted lg:hidden"
        onClick={onMenuOpen}
        aria-label={tNav("openMenu")}
      >
        <IconMenu />
      </button>
      <HeaderDateTime />
    </header>
  );
}

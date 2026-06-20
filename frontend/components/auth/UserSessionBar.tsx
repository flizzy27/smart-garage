"use client";

import { useTranslations } from "next-intl";
import { logoutAction } from "@/lib/actions/auth";
import { Link } from "@/lib/i18n/navigation";
import { useAuthSession } from "@/providers/AuthSessionProvider";
import { Button } from "@/components/ui/Button";

type Props = {
  collapsed?: boolean;
};

export function UserSessionBar({ collapsed = false }: Props) {
  const t = useTranslations("auth");
  const user = useAuthSession();
  if (!user) return null;

  const initial = (user.displayName || user.username).charAt(0).toUpperCase();

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-sidebar-border px-2 py-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
          title={user.displayName || user.username}
        >
          {initial}
        </div>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="h-7 w-7 p-0"
            title={t("signOut")}
            aria-label={t("signOut")}
          >
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-sidebar-border px-4 py-3">
      <p className="truncate text-xs font-medium text-foreground">
        {user.displayName || user.username}
      </p>
      <p className="truncate text-[10px] text-muted-foreground">@{user.username}</p>
      {user.role === "ADMIN" ? (
        <Link
          href="/admin"
          className="block text-xs font-medium text-accent hover:underline"
        >
          {t("admin")}
        </Link>
      ) : null}
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" className="h-7 px-0 text-xs">
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}

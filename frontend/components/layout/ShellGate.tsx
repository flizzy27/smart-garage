"use client";

import { usePathname } from "@/lib/i18n/navigation";
import { AppShell } from "./AppShell";
import { AuthLocaleSwitcher } from "@/components/auth/AuthLocaleSwitcher";

const AUTH_ROUTES = ["/login", "/register"];

export function ShellGate({
  children,
  hasBackground = false,
}: {
  children: React.ReactNode;
  hasBackground?: boolean;
}) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.endsWith(route),
  );

  if (isAuth) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <AuthLocaleSwitcher />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    );
  }

  return <AppShell hasBackground={hasBackground}>{children}</AppShell>;
}

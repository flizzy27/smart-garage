"use client";

import { createContext, useContext } from "react";
import type { CurrentUser } from "@/lib/auth/current-user";

const AuthContext = createContext<CurrentUser | null>(null);

export function AuthSessionProvider({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  return useContext(AuthContext);
}

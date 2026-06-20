"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createUserAction, toggleUserActiveAction, type AuthActionResult } from "@/lib/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type AdminUser = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  vehicleCount: number;
};

type Props = {
  users: AdminUser[];
};

export function AdminUsersPanel({ users }: Props) {
  const t = useTranslations("admin");
  const [createState, createAction, creating] = useActionState<
    AuthActionResult | null,
    FormData
  >(createUserAction, null);

  return (
    <div className="space-y-8">
      <form
        action={createAction}
        className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("createUser")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("createUserHint")}</p>
        </div>

        {createState?.error ? (
          <Alert variant="error">{t(`errors.${createState.error}` as "errors.failed")}</Alert>
        ) : null}
        {createState?.ok ? <Alert variant="success">{t("userCreated")}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-username" required>
              {t("username")}
            </Label>
            <Input id="new-username" name="username" required minLength={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-display">{t("displayName")}</Label>
            <Input id="new-display" name="displayName" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="new-password" required>
              {t("password")}
            </Label>
            <Input id="new-password" name="password" type="password" required minLength={8} />
          </div>
        </div>
        <Button type="submit" disabled={creating}>
          {creating ? t("creating") : t("create")}
        </Button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("usersTitle")}</h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium text-foreground">
                  {user.displayName || user.username}{" "}
                  <span className="text-xs text-muted-foreground">@{user.username}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.role} · {user.vehicleCount} {t("vehicles")} ·{" "}
                  {user.isActive ? t("active") : t("inactive")}
                </p>
              </div>
              <ToggleActiveForm userId={user.id} isActive={user.isActive} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ToggleActiveForm({ userId, isActive }: { userId: string; isActive: boolean }) {
  const t = useTranslations("admin");
  const [state, action] = useActionState<AuthActionResult | null, FormData>(
    toggleUserActiveAction,
    null,
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
      <Button type="submit" variant="ghost" className="h-8 px-2 text-xs">
        {isActive ? t("deactivate") : t("activate")}
      </Button>
      {state?.error ? <span className="text-xs text-danger">{t("errors.failed")}</span> : null}
    </form>
  );
}

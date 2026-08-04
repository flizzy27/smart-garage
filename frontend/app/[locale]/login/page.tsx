import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOidcConfig } from "@/lib/auth/oidc";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sessionExpired?: string; error?: string; from?: string }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { sessionExpired, error, from } = await searchParams;
  setRequestLocale(locale);

  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (user) {
    redirect(`/${locale}`);
  }

  // Only the label and the entry URL reach the browser — never the client id or
  // secret, which stay in the server-side environment.
  const oidcConfig = getOidcConfig();
  const startParams = new URLSearchParams({ locale });
  if (from && from.startsWith("/") && !from.startsWith("//")) {
    startParams.set("next", from);
  }

  return (
    <LoginForm
      sessionExpired={sessionExpired === "1"}
      errorCode={error ?? null}
      oidc={
        oidcConfig
          ? {
              label: oidcConfig.buttonLabel,
              startUrl: `/api/auth/oidc/start?${startParams}`,
            }
          : null
      }
    />
  );
}

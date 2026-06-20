import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
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

  return <LoginForm />;
}

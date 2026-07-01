import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import type { Metadata, Viewport } from "next";
import { geistMono, geistSans } from "@/lib/fonts";
import { THEME_INIT_SCRIPT } from "@/lib/theme/init-script";
import { routing } from "@/lib/i18n/routing";
import { UserSettingsProvider } from "@/providers/UserSettingsProvider";
import { AppearanceProvider } from "@/providers/AppearanceProvider";
import { LocaleSync } from "@/components/settings/LocaleSync";
import { ShellGate } from "@/components/layout/ShellGate";
import { AuthSessionProvider } from "@/providers/AuthSessionProvider";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findAppearanceForUser } from "@/lib/repositories/preferences";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  applicationName: "Smart Garage",
  title: "Smart Garage",
  description: "Self-hosted vehicle management and maintenance tracking",
  icons: {
    icon: "/brand/smart-garage-logo.png",
    apple: "/brand/smart-garage-logo.png",
  },
  // App-like behavior on iOS home-screen launch (not marketing/SEO).
  appleWebApp: {
    capable: true,
    title: "Smart Garage",
    statusBarStyle: "default",
  },
  // Stop iOS from turning numbers (e.g. mileage, VINs) into tap-to-call links.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Extend under the notch / home indicator so safe-area insets take effect.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#090e1a" },
  ],
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const user = await getCurrentUser().catch(() => null);
  const initialSettings =
    user != null
      ? await (await import("@/lib/repositories/preferences"))
          .findPreferencesForUser(user.id)
          .catch(() => undefined)
      : undefined;
  const appearance =
    user != null
      ? await findAppearanceForUser(user.id).catch(() => undefined)
      : undefined;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-design={appearance?.designPreset ?? "default"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
          suppressHydrationWarning
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthSessionProvider user={user}>
            <UserSettingsProvider initialSettings={initialSettings}>
              <AppearanceProvider initial={appearance}>
                <LocaleSync />
                <ShellGate>{children}</ShellGate>
              </AppearanceProvider>
            </UserSettingsProvider>
          </AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

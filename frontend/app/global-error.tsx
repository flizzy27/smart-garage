"use client";

/**
 * Root-level error boundary — the absolute last resort net.
 *
 * This only catches errors that escape `app/[locale]/error.tsx` (e.g. a
 * failure in the root layout itself, before locale/i18n providers mount).
 * Because it replaces the entire root layout, it must render its own
 * `<html>`/`<body>` and cannot rely on Tailwind/theme providers or
 * `next-intl` translations being available — kept intentionally minimal and
 * dependency-free.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#0b1120",
          color: "#e2e8f0",
        }}
      >
        <div style={{ maxWidth: 360, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 16 }}>
            Smart Garage hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}

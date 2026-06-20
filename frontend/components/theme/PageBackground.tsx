"use client";

type PageBackgroundProps = {
  enabled: boolean;
};

export function PageBackground({ enabled }: PageBackgroundProps) {
  if (!enabled) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/api/users/background)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-background/55 dark:bg-background/65"
        aria-hidden
      />
    </>
  );
}

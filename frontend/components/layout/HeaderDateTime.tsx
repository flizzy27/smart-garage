"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { formatDate } from "@/lib/regional/format";

export function HeaderDateTime() {
  const locale = useLocale();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return null;
  }

  const time = formatDate(now, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const date = formatDate(now, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <time
        dateTime={now.toISOString()}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-light tabular-nums tracking-wide text-muted-foreground/75"
      >
        {time}
      </time>
      <time
        dateTime={now.toISOString().slice(0, 10)}
        className="ml-auto text-xs text-muted-foreground/60"
      >
        {date}
      </time>
    </>
  );
}

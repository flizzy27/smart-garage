/** Convert user-facing euro amount to integer cents for storage. */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number | bigint | null | undefined): number | null {
  if (cents == null) return null;
  return Number(cents) / 100;
}

export function parseEuroInput(value: FormDataEntryValue | null | undefined): number | null {
  if (value == null || value === "") return null;
  const raw = String(value).trim().replace(",", ".");
  const euros = parseFloat(raw);
  if (Number.isNaN(euros) || euros < 0) return null;
  return eurosToCents(euros);
}

export function formatEuros(
  cents: number | bigint | null | undefined,
  locale: string,
  currency = "EUR",
): string {
  const euros = centsToEuros(cents);
  if (euros == null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(euros);
}

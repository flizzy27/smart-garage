export type YearRange = {
  from: number;
  to: number;
};

/** Split production years into generation ranges (gap > 2 years starts a new generation). */
export function groupYearsIntoGenerations(years: number[]): YearRange[] {
  if (years.length === 0) return [];

  const sorted = [...new Set(years)].sort((a, b) => a - b);
  const ranges: YearRange[] = [];
  let from = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const year = sorted[i];
    if (year - prev > 2) {
      ranges.push({ from, to: prev });
      from = year;
    }
    prev = year;
  }

  ranges.push({ from, to: prev });
  return ranges;
}

export function formatGenerationName(range: YearRange): string {
  if (range.from === range.to) return String(range.from);
  return `${range.from}–${range.to}`;
}

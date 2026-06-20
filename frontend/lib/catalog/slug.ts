export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function uniqueSlug(base: string, suffix: string | number): string {
  const slug = slugify(base);
  const tail = String(suffix);
  const maxBase = Math.max(1, 120 - tail.length - 1);
  return `${slug.slice(0, maxBase)}-${tail}`;
}

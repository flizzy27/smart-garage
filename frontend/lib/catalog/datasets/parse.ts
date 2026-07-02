import type { FuelType } from "@prisma/client";
import { psToKw } from "@/lib/catalog/parse-style";

export type CanonicalBrand = {
  slug: string;
  name: string;
  country: string | null;
};

const CANONICAL_BRANDS: Record<string, CanonicalBrand> = {
  acura: { slug: "acura", name: "Acura", country: "JP" },
  "alfa-romeo": { slug: "alfa-romeo", name: "Alfa Romeo", country: "IT" },
  amc: { slug: "amc", name: "AMC", country: "US" },
  "aston-martin": { slug: "aston-martin", name: "Aston Martin", country: "GB" },
  audi: { slug: "audi", name: "Audi", country: "DE" },
  bentley: { slug: "bentley", name: "Bentley", country: "GB" },
  bmw: { slug: "bmw", name: "BMW", country: "DE" },
  bugatti: { slug: "bugatti", name: "Bugatti", country: "FR" },
  buick: { slug: "buick", name: "Buick", country: "US" },
  cadillac: { slug: "cadillac", name: "Cadillac", country: "US" },
  chevrolet: { slug: "chevrolet", name: "Chevrolet", country: "US" },
  chrysler: { slug: "chrysler", name: "Chrysler", country: "US" },
  citroen: { slug: "citroen", name: "Citroen", country: "FR" },
  datsun: { slug: "datsun", name: "Datsun", country: "JP" },
  dodge: { slug: "dodge", name: "Dodge", country: "US" },
  ferrari: { slug: "ferrari", name: "Ferrari", country: "IT" },
  fiat: { slug: "fiat", name: "Fiat", country: "IT" },
  ford: { slug: "ford", name: "Ford", country: "US" },
  gmc: { slug: "gmc", name: "GMC", country: "US" },
  honda: { slug: "honda", name: "Honda", country: "JP" },
  hyundai: { slug: "hyundai", name: "Hyundai", country: "KR" },
  "jaguar-land-rover": { slug: "jaguar-land-rover", name: "Jaguar Land Rover", country: "GB" },
  jeep: { slug: "jeep", name: "Jeep", country: "US" },
  kia: { slug: "kia", name: "Kia", country: "KR" },
  lamborghini: { slug: "lamborghini", name: "Lamborghini", country: "IT" },
  lexus: { slug: "lexus", name: "Lexus", country: "JP" },
  lincoln: { slug: "lincoln", name: "Lincoln", country: "US" },
  mahindra: { slug: "mahindra", name: "Mahindra", country: "IN" },
  "maruti-suzuki": { slug: "maruti-suzuki", name: "Maruti Suzuki", country: "IN" },
  mazda: { slug: "mazda", name: "Mazda", country: "JP" },
  mclaren: { slug: "mclaren", name: "McLaren", country: "GB" },
  "mercedes-benz": { slug: "mercedes-benz", name: "Mercedes-Benz", country: "DE" },
  mercury: { slug: "mercury", name: "Mercury", country: "US" },
  mini: { slug: "mini", name: "MINI", country: "GB" },
  mitsubishi: { slug: "mitsubishi", name: "Mitsubishi", country: "JP" },
  nissan: { slug: "nissan", name: "Nissan", country: "JP" },
  oldsmobile: { slug: "oldsmobile", name: "Oldsmobile", country: "US" },
  opel: { slug: "opel", name: "Opel", country: "DE" },
  peugeot: { slug: "peugeot", name: "Peugeot", country: "FR" },
  plymouth: { slug: "plymouth", name: "Plymouth", country: "US" },
  pontiac: { slug: "pontiac", name: "Pontiac", country: "US" },
  porsche: { slug: "porsche", name: "Porsche", country: "DE" },
  renault: { slug: "renault", name: "Renault", country: "FR" },
  "rolls-royce": { slug: "rolls-royce", name: "Rolls-Royce", country: "GB" },
  saab: { slug: "saab", name: "Saab", country: "SE" },
  subaru: { slug: "subaru", name: "Subaru", country: "JP" },
  tata: { slug: "tata", name: "Tata Motors", country: "IN" },
  tesla: { slug: "tesla", name: "Tesla", country: "US" },
  toyota: { slug: "toyota", name: "Toyota", country: "JP" },
  triumph: { slug: "triumph", name: "Triumph", country: "GB" },
  volkswagen: { slug: "volkswagen", name: "Volkswagen", country: "DE" },
  volvo: { slug: "volvo", name: "Volvo", country: "SE" },
};

const BRAND_ALIASES: Record<string, string> = {
  alfa: "alfa-romeo",
  "alfa romeo": "alfa-romeo",
  "aston martin": "aston-martin",
  benz: "mercedes-benz",
  chevroelt: "chevrolet",
  chevy: "chevrolet",
  "jaguar land rover": "jaguar-land-rover",
  landrover: "jaguar-land-rover",
  maruti: "maruti-suzuki",
  "maruti suzuki": "maruti-suzuki",
  maxda: "mazda",
  "mc laren": "mclaren",
  mclaren: "mclaren",
  mercedes: "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  "rolls royce": "rolls-royce",
  "tata motors": "tata",
  toyouta: "toyota",
  vokswagen: "volkswagen",
  vw: "volkswagen",
};

const BRAND_JUNK = new Set(["hi", "nan", "na", ""]);

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function canonicalizeBrand(raw: string | undefined | null): CanonicalBrand | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (BRAND_JUNK.has(cleaned)) return null;

  const slug = BRAND_ALIASES[cleaned] ?? slugify(cleaned);
  if (!slug) return null;
  return CANONICAL_BRANDS[slug] ?? { slug, name: titleCase(cleaned), country: null };
}

export function canonicalizeKnownBrand(raw: string | undefined | null): CanonicalBrand | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (BRAND_JUNK.has(cleaned)) return null;
  const aliasSlug = BRAND_ALIASES[cleaned];
  const slug = aliasSlug ?? slugify(cleaned);
  return CANONICAL_BRANDS[slug] ?? null;
}

export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function normalizeModelName(
  raw: string | undefined | null,
  brand?: CanonicalBrand | null,
): string | null {
  if (!raw) return null;
  let name = raw.trim().replace(/\s+/g, " ");
  if (!name) return null;

  if (brand) {
    const brandWords = [
      ...brand.name.toLowerCase().split(/[\s-]+/),
      ...brand.slug.toLowerCase().split("-"),
    ];
    const words = name.split(" ");
    if (words.length > 1 && brandWords.includes(words[0].toLowerCase())) {
      name = words.slice(1).join(" ");
    }
  }

  if (!name) return null;
  if (name === name.toUpperCase()) {
    name = titleCase(name);
  }
  return name || null;
}

export function resolveBrandAndModel(
  rawBrand: string | undefined | null,
  rawModel: string | undefined | null,
): { brand: CanonicalBrand; modelName: string } | null {
  const companyBrand = canonicalizeBrand(rawBrand);
  if (!rawModel) return null;

  const normalizedModel = rawModel.trim().replace(/\s+/g, " ");
  if (!normalizedModel) return null;
  const words = normalizedModel.split(" ");

  let brand = companyBrand;
  let modelWithoutBrand = normalizedModel;
  if (words.length > 1) {
    for (let count = Math.min(3, words.length - 1); count >= 1; count--) {
      const possibleBrand = canonicalizeKnownBrand(words.slice(0, count).join(" "));
      if (!possibleBrand) continue;
      brand = possibleBrand;
      modelWithoutBrand = words.slice(count).join(" ");
      break;
    }
  }

  if (!brand) return null;
  const modelName = normalizeModelName(modelWithoutBrand, brand);
  if (!modelName) return null;
  return { brand, modelName };
}

function parseNumberRangeMax(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const nums = String(raw)
    .replace(/,/g, "")
    .match(/\d+(?:\.\d+)?/g);
  if (!nums?.length) return null;
  const values = nums.map(Number).filter((n) => !Number.isNaN(n));
  if (values.length === 0) return null;
  return Math.max(...values);
}

export function parsePowerPs(raw: string | undefined | null): number | null {
  const value = parseNumberRangeMax(raw);
  if (value == null) return null;
  const ps = Math.round(value);
  if (ps <= 0 || ps > 2000) return null;
  return ps;
}

export function parseTorqueNm(raw: string | undefined | null): number | null {
  const value = parseNumberRangeMax(raw);
  if (value == null) return null;
  const nm = Math.round(value);
  if (nm <= 0 || nm > 5000) return null;
  return nm;
}

export function parseDisplacementCc(
  raw: string | undefined | null,
  opts: { isElectric?: boolean } = {},
): number | null {
  if (!raw) return null;
  const text = String(raw).toLowerCase();
  if (opts.isElectric) return null;
  if (text.includes("kwh") || text.includes("kw h") || text.includes("battery")) return null;
  const value = parseNumberRangeMax(text);
  if (value == null) return null;
  const cc = Math.round(value);
  if (cc < 50 || cc > 12000) return null;
  return cc;
}

export function cubicInchesToCc(ci: number): number {
  return Math.round(ci * 16.387064);
}

export function powerKwFromPs(ps: number | null): number | null {
  return ps == null ? null : psToKw(ps);
}

export function parseFuelType(raw: string | undefined | null): FuelType | null {
  if (!raw) return null;
  const t = raw.toLowerCase();

  const hasPlugin = /plug[\s-]*in|phev/.test(t);
  const hasHybrid = /hybrid|hev|hyrbrid/.test(t);
  const hasElectric = /electric|ev\b|\bev|battery|bev/.test(t);
  const hasPetrol = /petrol|gas(?!\s*\+)|gasoline/.test(t);
  const hasDiesel = /diesel|tdi|cdi/.test(t);
  const hasHydrogen = /hydrogen|fuel cell/.test(t);
  const hasCng = /cng|natural gas/.test(t);
  const hasLpg = /lpg|autogas/.test(t);

  if (hasPlugin) return "PLUGIN_HYBRID";
  if (hasHybrid || (hasElectric && (hasPetrol || hasDiesel))) return "HYBRID";
  if (hasElectric && !hasPetrol && !hasDiesel) return "ELECTRIC";
  if (hasCng) return "CNG";
  if (hasLpg) return "LPG";
  if (hasDiesel && !hasPetrol) return "DIESEL";
  if (hasPetrol) return "PETROL";
  if (hasDiesel) return "DIESEL";
  if (hasHydrogen) return "OTHER";
  return null;
}

export function parseCylinders(engine: string | undefined | null): number | null {
  if (!engine) return null;
  const t = engine.toUpperCase();

  const vMatch = t.match(/\bV\s?(\d{1,2})\b/);
  if (vMatch) return clampCylinders(Number(vMatch[1]));

  const inlineMatch = t.match(/\bI\s?(\d{1,2})\b|\bINLINE[\s-]?(\d{1,2})\b|\bL(\d)\b/);
  if (inlineMatch) {
    const n = inlineMatch[1] ?? inlineMatch[2] ?? inlineMatch[3];
    if (n) return clampCylinders(Number(n));
  }

  const boxerMatch = t.match(/\bBOXER[\s-]?(\d{1,2})\b|\bFLAT[\s-]?(\d{1,2})\b/);
  if (boxerMatch) {
    const n = boxerMatch[1] ?? boxerMatch[2];
    if (n) return clampCylinders(Number(n));
  }

  const cylMatch = t.match(/(\d{1,2})[\s-]*CYL/);
  if (cylMatch) return clampCylinders(Number(cylMatch[1]));

  return null;
}

function clampCylinders(n: number): number | null {
  if (!Number.isFinite(n) || n < 1 || n > 16) return null;
  return n;
}

export function parseAspiration(engine: string | undefined | null): string | null {
  if (!engine) return null;
  const t = engine.toUpperCase();
  if (/TWIN[\s-]?TURBO|BI[\s-]?TURBO|TWIN[\s-]?SCROLL/.test(t)) return "Twin-turbo";
  if (/SUPERCHARG/.test(t)) return "Supercharged";
  if (/TURBO/.test(t)) return "Turbo";
  return null;
}

export function parseTopSpeedKmh(raw: string | undefined | null): number | null {
  const value = parseNumberRangeMax(raw);
  if (value == null) return null;
  const kmh = Math.round(value);
  if (kmh < 40 || kmh > 600) return null;
  return kmh;
}

export function parseZeroToHundred(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const match = String(raw).match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const seconds = Number(match[0]);
  if (Number.isNaN(seconds) || seconds <= 0 || seconds > 60) return null;
  return seconds;
}

export function parseSeats(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const match = String(raw).match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return n;
}

export function parsePriceUsd(raw: string | undefined | null): number | null {
  const value = parseNumberRangeMax(raw);
  if (value == null) return null;
  const price = Math.round(value);
  if (price < 100 || price > 100_000_000) return null;
  return price;
}

export function buildEngineName(
  rawEngine: string | undefined | null,
  opts: { cylinders?: number | null; displacementCc?: number | null; isElectric?: boolean } = {},
): string {
  const raw = rawEngine?.trim();
  if (opts.isElectric) {
    return raw && /electric|motor/i.test(raw) ? titleCaseKeepAcronyms(raw) : "Electric Motor";
  }

  if (raw) {
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (cleaned && cleaned.length <= 60) return titleCaseKeepAcronyms(cleaned);
  }

  const parts: string[] = [];
  if (opts.cylinders) parts.push(`${opts.cylinders}-cyl`);
  if (opts.displacementCc) parts.push(`${(opts.displacementCc / 1000).toFixed(1)}L`);
  return parts.join(" ") || "Base";
}

function titleCaseKeepAcronyms(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => {
      if (/^[A-Z0-9.]{1,5}$/.test(word)) return word;
      if (/^[VLIW]\d+$/i.test(word)) return word.toUpperCase();
      if (/^(TDI|TSI|TFSI|DSG|EV|PHEV)$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

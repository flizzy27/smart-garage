/**
 * Verifies the issue #9 fix against the real bundled catalog without touching a
 * database: expands every model the same way the importers do (old vs new rule)
 * and reports how many production years the old rule silently dropped.
 *
 * Usage: node scripts/verify-catalog-years.mjs [Make Model ...]
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, "..", "prisma", "seed", "catalog.generated.json");
const currentYear = new Date().getFullYear();

function cleanYears(years) {
  const maxYear = currentYear + 1;
  return [...new Set(years)]
    .filter((year) => Number.isInteger(year) && year >= 1886 && year <= maxYear)
    .sort((a, b) => a - b);
}

function yearsFromRange(from, to) {
  const start = Math.max(1886, Math.min(from, to));
  const end = Math.min(currentYear + 1, Math.max(from, to));
  const years = [];
  for (let year = start; year <= end; year++) years.push(year);
  return years;
}

function modelProductionYears(model) {
  if (model.years?.length) return cleanYears(model.years);
  return yearsFromRange(model.yearFrom ?? 1990, model.yearTo ?? currentYear);
}

function configProductionYears(config, model) {
  if (config.years?.length) return cleanYears(config.years);
  if (config.yearFrom != null || config.yearTo != null) {
    return yearsFromRange(
      config.yearFrom ?? model.yearFrom ?? 1990,
      config.yearTo ?? config.yearFrom ?? model.yearTo ?? currentYear,
    );
  }
  return modelProductionYears(model);
}

/** Pre-fix behaviour: configs win outright and the model's own range is lost. */
function oldYears(model) {
  const configs = model.configs ?? [];
  if (configs.length === 0) return modelProductionYears(model);
  const years = new Set();
  for (const config of configs) {
    for (const year of configProductionYears(config, model)) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

/**
 * Post-fix behaviour: base years the configs don't cover are emitted as
 * Standard/Base — but only when the model states its years explicitly, so the
 * 1990..today fallback never invents history for a trim-only entry.
 */
function newYears(model) {
  const configs = model.configs ?? [];
  if (configs.length === 0) return modelProductionYears(model);

  const covered = new Set();
  for (const config of configs) {
    for (const year of configProductionYears(config, model)) covered.add(year);
  }

  const hasExplicitBaseYears = Boolean(
    model.years?.length || model.yearFrom != null || model.yearTo != null,
  );
  const base = hasExplicitBaseYears ? modelProductionYears(model) : [];
  return [...new Set([...covered, ...base])].sort((a, b) => a - b);
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf-8").replace(/^﻿/, ""));
const filters = process.argv.slice(2).map((arg) => arg.toLowerCase());

let modelsImproved = 0;
let yearsRecovered = 0;
let totalModels = 0;
let regressions = 0;
const samples = [];

for (const make of catalog) {
  for (const model of make.models) {
    totalModels++;
    const before = oldYears(model);
    const after = newYears(model);
    const gained = after.filter((year) => !before.includes(year));
    const lost = before.filter((year) => !after.includes(year));

    if (lost.length > 0) regressions++;
    if (gained.length > 0) {
      modelsImproved++;
      yearsRecovered += gained.length;
    }

    const label = `${make.name} ${model.name}`;
    if (filters.length > 0 && filters.some((f) => label.toLowerCase().includes(f))) {
      samples.push({ label, before, after, gained });
    }
  }
}

for (const sample of samples) {
  console.log(`\n${sample.label}`);
  console.log(`  before: ${sample.before.join(", ") || "(none)"}`);
  console.log(`  after:  ${sample.after.join(", ") || "(none)"}`);
  console.log(`  gained: ${sample.gained.join(", ") || "(none)"}`);
}

console.log(`\nModels scanned:          ${totalModels}`);
console.log(`Models gaining years:    ${modelsImproved}`);
console.log(`Production years fixed:  ${yearsRecovered}`);
console.log(`Models losing years:     ${regressions}`);

if (regressions > 0) {
  console.error("\nFAIL: the new rule must never remove a year that was available before.");
  process.exit(1);
}
console.log("\nOK: strictly additive — no model lost a selectable year.");

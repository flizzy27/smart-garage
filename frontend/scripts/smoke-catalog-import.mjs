/**
 * End-to-end check for the issue #9 catalog fix: runs the real container
 * seeding script against a throwaway SQLite database and asserts that a model
 * like the Ford Maverick actually offers its full production range.
 *
 * Usage (from frontend/):  node scripts/smoke-catalog-import.mjs
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendDir, "..");

const workDir = mkdtempSync(path.join(tmpdir(), "smart-garage-catalog-"));
const dbPath = path.join(workDir, "smoke.db");
const databaseUrl = `file:${dbPath}`;

let failed = false;

function check(name, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${name}`);
    return;
  }
  failed = true;
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

try {
  console.log(`[smoke] temp database: ${dbPath}`);

  // Invoke the Prisma CLI's JS entry directly: recent Node refuses to spawn a
  // `.cmd` shim without a shell, and a shell mangles the space in this repo's
  // path on Windows. A relative --schema keeps that path out of the argv too.
  const prismaCli = path.join(frontendDir, "node_modules", "prisma", "build", "index.js");
  execFileSync(
    process.execPath,
    [prismaCli, "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
      cwd: frontendDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    },
  );

  console.log("[smoke] running docker/ensure-catalog.mjs against the temp database…");
  // The script lives next to the app inside the image (/app/docker), so ESM can
  // resolve @prisma/client from /app/node_modules. In the repo `docker/` sits
  // above `frontend/`, so run a copy from inside frontend/ to reproduce the
  // container's module resolution — the script itself is byte-identical.
  const stagedScript = path.join(frontendDir, ".tmp", "ensure-catalog.smoke.mjs");
  mkdirSync(path.dirname(stagedScript), { recursive: true });
  copyFileSync(path.join(repoRoot, "docker", "ensure-catalog.mjs"), stagedScript);

  try {
    execFileSync(process.execPath, [stagedScript], {
      cwd: frontendDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: ["ignore", "ignore", "inherit"],
    });
  } finally {
    rmSync(stagedScript, { force: true });
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    const totalYears = await prisma.catalogModelYear.count();
    console.log(`\n[smoke] imported ${totalYears.toLocaleString()} model years\n`);
    check("catalog is populated", totalYears > 0, `got ${totalYears}`);

    async function yearsFor(manufacturerName, seriesName) {
      const series = await prisma.catalogSeries.findFirst({
        where: {
          name: seriesName,
          manufacturer: { name: manufacturerName },
        },
        select: { id: true },
      });
      if (!series) return null;

      const rows = await prisma.catalogModelYear.findMany({
        where: { variant: { generation: { seriesId: series.id } } },
        select: { year: true },
        distinct: ["year"],
        orderBy: { year: "asc" },
      });
      return rows.map((row) => row.year);
    }

    const maverick = await yearsFor("Ford", "Maverick");
    console.log(`  Ford Maverick years: ${maverick?.join(", ") ?? "(model not found)"}`);
    check("Ford Maverick exists", maverick !== null);
    for (const year of [2022, 2023, 2024, 2025, 2026]) {
      check(`Ford Maverick offers ${year}`, maverick?.includes(year) ?? false);
    }
    check(
      "Ford Maverick keeps its original 1970s years",
      (maverick?.includes(1970) ?? false) && (maverick?.includes(1975) ?? false),
    );

    const sierra = await yearsFor("GMC", "Sierra");
    console.log(`  GMC Sierra years: ${sierra?.length ?? 0} entries`);
    check("GMC Sierra keeps its full range", (sierra?.length ?? 0) > 20, `got ${sierra?.length}`);

    // A trim-only entry must not gain invented history.
    const at4 = await yearsFor("GMC", "Sierra 1500 AT4");
    console.log(`  GMC Sierra 1500 AT4 years: ${at4?.join(", ") ?? "(not found)"}`);
    check(
      "trim-only entry stays at its stated year",
      at4 === null || (at4.length <= 2 && !at4.includes(1990)),
      `got ${at4?.join(", ")}`,
    );

    const beyondNextYear = await prisma.catalogModelYear.count({
      where: { year: { gt: new Date().getFullYear() + 1 } },
    });
    check("no model year beyond next year", beyondNextYear === 0, `got ${beyondNextYear}`);

    const syncState = await prisma.catalogSyncState.findUnique({
      where: { source: "OPEN_VEHICLE_DB" },
      select: { datasetVersion: true },
    });
    check(
      "dataset version recorded",
      syncState?.datasetVersion === "bundled-catalog.merged-2026-08",
      syncState?.datasetVersion,
    );
  } finally {
    await prisma.$disconnect();
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

console.log(failed ? "\n[smoke] FAILED" : "\n[smoke] all checks passed");
process.exit(failed ? 1 : 0);

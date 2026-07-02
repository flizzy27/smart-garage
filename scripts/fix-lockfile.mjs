/**
 * Patch package-lock.json from the last Linux-valid lockfile:
 * - keep Linux optional deps (@emnapi/*, @swc/helpers peer)
 * - remove qrcode (dropped in v0.8.0)
 * - bump lockfile version to match package.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = join(root, "frontend");
const lockPath = join(frontend, "package-lock.json");
const pkg = JSON.parse(readFileSync(join(frontend, "package.json"), "utf8"));
const lock = JSON.parse(
  execSync("git show a2faf5f:frontend/package-lock.json", {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  }),
);

lock.version = pkg.version;
const rootPkg = lock.packages[""];
if (rootPkg) {
  rootPkg.version = pkg.version;
}
if (rootPkg?.dependencies) {
  delete rootPkg.dependencies.qrcode;
}
if (rootPkg?.devDependencies) {
  delete rootPkg.devDependencies["@types/qrcode"];
}

for (const key of Object.keys(lock.packages)) {
  if (
    key === "node_modules/qrcode" ||
    key === "node_modules/@types/qrcode" ||
    key.startsWith("node_modules/qrcode/") ||
    key.startsWith("node_modules/@types/qrcode/")
  ) {
    delete lock.packages[key];
  }
}

// Top-level lockfile "dependencies" (lockfile v2 compat; v3 uses packages only)
if (lock.dependencies?.qrcode) {
  delete lock.dependencies.qrcode;
}

writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n", "utf8");

const required = [
  "node_modules/@emnapi/core",
  "node_modules/@emnapi/runtime",
];
const missing = required.filter((k) => !lock.packages[k]);
if (missing.length) {
  console.error("ERROR: still missing after patch:", missing.join(", "));
  process.exit(1);
}

const swcPeer = Object.keys(lock.packages).find(
  (k) => k.includes("@swc/helpers") && lock.packages[k]?.version === "0.5.23",
);
if (!swcPeer) {
  console.error("ERROR: @swc/helpers@0.5.23 peer entry not found");
  process.exit(1);
}

console.log("OK: lockfile patched", {
  version: lock.version,
  emnapiCore: lock.packages["node_modules/@emnapi/core"]?.version,
  emnapiRuntime: lock.packages["node_modules/@emnapi/runtime"]?.version,
  swcHelpers023: swcPeer,
  hasQrcode: Boolean(lock.packages["node_modules/qrcode"]),
});

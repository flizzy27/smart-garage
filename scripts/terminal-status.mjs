#!/usr/bin/env node
/**
 * Summarize recent Cursor terminal sessions — detect unknown exit codes and stuck runs.
 * Usage: node scripts/terminal-status.mjs [terminals-folder]
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const terminalsDir =
  process.argv[2] ??
  process.env.CURSOR_TERMINALS_DIR ??
  join(process.env.USERPROFILE ?? process.env.HOME ?? ".", ".cursor", "projects");

async function resolveDir(dir) {
  try {
    const entries = await readdir(dir);
    if (entries.some((e) => e.endsWith(".txt"))) return dir;
  } catch {
    /* not a terminals dir */
  }
  return null;
}

async function findTerminalsFolder(start) {
  const direct = await resolveDir(start);
  if (direct) return direct;

  try {
    const projects = await readdir(start);
    for (const p of projects) {
      const candidate = join(start, p, "terminals");
      const hit = await resolveDir(candidate);
      if (hit) return hit;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function parseTerminal(text, file) {
  const header = text.match(/^---\n([\s\S]*?)\n---/);
  const meta = Object.fromEntries(
    (header?.[1] ?? "")
      .split("\n")
      .map((line) => line.split(": ").map((s) => s.trim()))
      .filter(([k]) => k)
  );

  const exitMatch = text.match(/^exit_code:\s*(.+)$/m);
  const exitCode = exitMatch ? exitMatch[1].trim() : "missing";
  const running = !text.includes("exit_code:") && meta.command;

  return {
    file,
    id: file.replace(".txt", ""),
    command: (meta.command ?? "").slice(0, 120),
    exitCode,
    running,
    elapsedMs: meta.elapsed_ms ? Number(meta.elapsed_ms) : null,
    startedAt: meta.started_at ?? null,
  };
}

const inputDir = process.argv[2];
let folder = inputDir ? await resolveDir(inputDir) : null;
if (!folder) {
  folder = await findTerminalsFolder(
    join(process.env.USERPROFILE ?? process.env.HOME ?? ".", ".cursor", "projects")
  );
}

if (!folder) {
  console.error("terminal-status: no terminals folder found. Pass path as first argument.");
  process.exit(2);
}

const files = (await readdir(folder)).filter((f) => f.endsWith(".txt"));
const stats = await Promise.all(
  files.map(async (f) => {
    const path = join(folder, f);
    const [content, st] = await Promise.all([readFile(path, "utf8"), stat(path)]);
    return { ...parseTerminal(content, f), mtime: st.mtimeMs };
  })
);

stats.sort((a, b) => b.mtime - a.mtime);
const recent = stats.slice(0, 8);

const problems = recent.filter(
  (t) => t.running || t.exitCode === "unknown" || (t.exitCode !== "missing" && t.exitCode !== "0")
);

console.log(`TERMINAL_STATUS: folder=${folder}`);
console.log(`TERMINAL_STATUS: scanned=${files.length} showing=${recent.length} problems=${problems.length}`);

for (const t of recent) {
  const flag =
    t.running ? "RUNNING" : t.exitCode === "unknown" ? "UNKNOWN" : t.exitCode === "0" ? "OK" : "FAIL";
  console.log(
    `TERMINAL_STATUS: [${flag}] id=${t.id} exit=${t.exitCode} ms=${t.elapsedMs ?? "-"} cmd=${t.command}`
  );
}

if (problems.length > 0) {
  console.log("TERMINAL_STATUS: action=read terminal files and retry; use scripts/ci-linux-docker.ps1 for CI");
  process.exit(1);
}

console.log("TERMINAL_STATUS: action=none");
process.exit(0);

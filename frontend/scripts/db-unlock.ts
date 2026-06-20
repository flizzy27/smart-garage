import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const dbPath = path.resolve(__dirname, "../data/smart-garage.db");

for (const suffix of ["-journal", "-wal", "-shm"]) {
  const file = `${dbPath}${suffix}`;
  if (existsSync(file)) {
    unlinkSync(file);
    console.log(`Removed ${path.basename(file)}`);
  }
}

console.log("SQLite lock files cleared.");

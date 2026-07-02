import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSqliteTuned: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Tune the SQLite connection for concurrent access (important on homelab/Unraid
 * where several requests can write at once).
 *
 * - `journal_mode=WAL`: readers no longer block writers and vice versa; this is
 *   a persistent property of the database file, so it only needs to be set once.
 * - `busy_timeout`: when a write does hit a lock, SQLite waits and retries for
 *   up to N ms instead of immediately throwing SQLITE_BUSY. This is per
 *   connection, so it is (re)applied here on client creation.
 *
 * Fire-and-forget: pragmas fail closed to SQLite defaults, so a transient error
 * here must never crash app startup.
 */
if (!globalForPrisma.prismaSqliteTuned) {
  globalForPrisma.prismaSqliteTuned = true;
  void (async () => {
    try {
      // Both PRAGMAs return a row (the resulting mode / timeout), so they must
      // be run with $queryRawUnsafe — $executeRawUnsafe rejects any statement
      // that yields results ("Execute returned results, which is not allowed in
      // SQLite"), which would abort before busy_timeout is ever applied.
      await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
      await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000;");
    } catch {
      // Non-fatal: fall back to SQLite defaults.
    }
  })();
}

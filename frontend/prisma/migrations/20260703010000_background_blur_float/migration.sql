-- AlterTable: backgroundBlurPx from Int to Float for finer blur control (0.5px steps)
-- SQLite is dynamically typed, so existing integer values are preserved as-is.
ALTER TABLE "UserPreferences" RENAME COLUMN "backgroundBlurPx" TO "backgroundBlurPx_old";

ALTER TABLE "UserPreferences" ADD COLUMN "backgroundBlurPx" REAL NOT NULL DEFAULT 8;

UPDATE "UserPreferences" SET "backgroundBlurPx" = "backgroundBlurPx_old";

ALTER TABLE "UserPreferences" DROP COLUMN "backgroundBlurPx_old";
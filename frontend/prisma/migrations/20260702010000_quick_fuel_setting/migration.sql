-- Add per-user quick fuel widget preference (enabled by default).
ALTER TABLE "UserPreferences" ADD COLUMN "quickFuelEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Instance-wide key/value settings (v0.13.0).
-- Purely additive: a new table only, nothing existing is touched, so this is
-- safe to apply to a live install on container start.
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

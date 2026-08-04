# Changelog

All notable changes are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

_Nothing yet._

## [0.10.0] - 2026-08-04

This release closes every open issue reported on GitHub. Most of them came from
users outside Germany, and together they make Smart Garage usable without
assuming metric units, German paperwork, or a local-only login.

### Added

- **Gallons and miles per gallon** ([#4]) — Settings → Regional now has a volume
  unit next to the distance unit. Pick **US gallons** and every fill-up form,
  price, total and chart switches over; with miles selected as well, fuel economy
  is shown as **MPG** instead of L/100 km. Volumes stay stored in litres and are
  only converted for display, so switching back and forth never changes your
  data.
- **Odometer page with charts** ([#6]) — a dedicated **Odometer** entry in the
  sidebar. Log a reading (optionally back-dated, with a note), and see your
  latest reading, distance tracked, average per day and month, a projection for
  the year, plus an odometer-over-time chart and distance-per-month bars.
  Back-dated readings are kept in the history and never lower the current
  reading.
- **Hide fields you don't use** ([#8]) — Settings → **Vehicle fields** lets you
  switch off any optional field. HSN and TSN are German type-approval numbers and
  are pointless elsewhere, so they can now simply be turned off; the same goes
  for VIN, colour, torque, drive type and the rest. Hiding never deletes stored
  data — switch a field back on and its value is still there.
- **Custom fields** ([#7]) — define your own vehicle fields (text, number, date
  or yes/no, with an optional unit) under Settings → Vehicle fields. They appear
  on every vehicle's form and detail page. Renaming a field keeps its values;
  deleting one removes its values too, after a confirmation.
- **OpenID Connect / SSO login** ([#5]) — optional single sign-on for Pocket ID,
  Authentik, Keycloak, Authelia and anything else that speaks OIDC. Configure it
  with environment variables in the Unraid template (`OIDC_ISSUER`,
  `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`); leave them empty and nothing changes.
  Uses the authorization code flow with PKCE, links to an existing account by
  e-mail on first login, and keeps the normal username/password form alongside.
  See [docs/OIDC.md](docs/OIDC.md).

### Fixed

- **The vehicle catalog offered only a single production year for many models**
  ([#9]) — the cause was in the catalog importer: as soon as a model had any
  trim-level entry, the model's own production range was thrown away. A Ford
  Maverick built 2022–2026 therefore offered nothing but 2026. Model years no
  longer disappear: **302 models regain 4,679 production years**, and no model
  loses one. The catalog updates itself on the next container start.
- **Production years were grouped into ranges you could not pick from** ([#9]) —
  the year list collapsed runs like "2022-2025" into one entry, and choosing it
  always recorded the *first* year, so a 2024 car was saved as a 2022. Every year
  is now selectable on its own.
- **Switching to manual entry lost what you had already selected** ([#9]) —
  picking a make and model in the catalog and then switching to "Enter manually"
  started from a blank form. Make, model and the selected year now carry over,
  and a hint next to the year picker points to manual entry when your year is
  missing.
- **Fuel cost per 100 km was 100× too low** — a car actually costing €15 per
  100 km was displayed as €0.15. The tile now shows the real figure, and follows
  your distance unit (cost per 100 mi when you use miles).
- **Backups did not contain odometer history** — restoring a backup deletes and
  rebuilds your data, so every manually logged odometer reading was silently
  lost. Odometer readings and custom fields are now part of the backup. Backups
  written by older versions still restore.

### Changed

- **Catalog updates no longer block startup** — an existing install now tops the
  catalog up in the background while the app is already serving, instead of
  holding the container for minutes after a Force Update. A fresh install still
  waits, because an empty catalog would leave the "add vehicle" form with nothing
  to choose from. The import only ever adds rows.

### Migrations

- `20260804090000_v0100_units_custom_fields_oidc` — purely additive: new
  preference columns (`volumeUnit`, `hiddenVehicleFields`), optional OIDC link
  columns on `User`, an optional note on `OdometerLog`, and the two new
  `VehicleCustomField` / `VehicleCustomFieldValue` tables. Nothing is dropped,
  renamed or rewritten, so updating an existing Unraid install cannot lose data.

### Notes

- Existing installs update via the normal **Force Update** — migrations and the
  catalog top-up run automatically, no manual database steps.
- Defaults are unchanged: litres, kilometres, all fields visible, no SSO. The new
  features only appear once you turn them on.

[#4]: https://github.com/flizzy27/smart-garage/issues/4
[#5]: https://github.com/flizzy27/smart-garage/issues/5
[#6]: https://github.com/flizzy27/smart-garage/issues/6
[#7]: https://github.com/flizzy27/smart-garage/issues/7
[#8]: https://github.com/flizzy27/smart-garage/issues/8
[#9]: https://github.com/flizzy27/smart-garage/issues/9

## [0.9.6] - 2026-07-04

### Fixed

- **Dialogs, modals, and overlays now render correctly above everything** — the shared `Modal` and `Dialog` components now render through a React portal at `document.body`, escaping any ancestor stacking context (notably the `backdrop-filter` applied to the main content column when a custom background image is set, which previously trapped `position: fixed` dialogs and could clip or hide them). This fixes the global issue affecting edit-service, delete-service, add-service, maintenance-item editing, delete confirmations, the modifications panel, the document preview, and the reminders wizard on desktop and mobile.
- **Body scroll locking is now consistent and leak-proof** — both `Modal` and `Dialog` now lock body scroll via a shared `useBodyScrollLock` hook with an open-count ref, so nested dialogs (e.g. a delete confirmation opened from within an edit modal) no longer reset scroll prematurely. Scroll position is saved on open and restored on close, and the scrollbar gap is compensated to avoid layout shift on desktop.
- **Dialog action buttons stay reachable on long forms** — `Dialog` now uses a fixed header / scrollable body / fixed footer layout (matching `Modal`), so Save/Cancel/Delete buttons remain visible even when the form content is long. The maintenance-record edit dialog was refactored to use this footer so its save/cancel buttons no longer scroll out of view.
- **Focus is trapped inside open dialogs** — a shared `useFocusTrap` hook moves focus into the dialog on open, keeps Tab/Shift-Tab cycling within the dialog, and restores focus to the previously-focused element on close. Improves keyboard accessibility across all overlays.
- **Safe-area insets on dialog headers/footers** — dialog header and footer now respect `safe-pt`/`safe-pb` so they stay clear of notches and home indicators on mobile.

### Changed

- **Elevated z-index for overlays** — portals now use `z-[100]` so they always paint above the sidebar (`z-50`), header (`z-30`), and sticky save bars, eliminating the previous z-index conflict where a dialog could render under the mobile sidebar.

### Notes

- No schema migration in this release. The service-history and latest-service fixes from v0.9.4/v0.9.5 remain in place; this release is a UI/overlay-only fix.
- Existing Unraid installs update via the normal container Force Update path — no manual DB steps.

## [0.9.5] - 2026-07-04

### Fixed

- Creating a new maintenance schedule no longer asks for or writes last-service date/odometer values. History entries are now created only when a service is explicitly logged.
- Editing a maintenance interval no longer exposes "last performed" or odometer fields, so interval changes cannot overwrite service history.
- Maintenance history is ordered by real service date and odometer instead of insertion order, and template-backed service names are localized in the selected language.
- Empty synthetic maintenance-history rows created from schedule baseline fields are removed by a new migration while the schedule fallback data remains available for due calculations.
- Editing an old maintenance record now advances the vehicle odometer when the edited service odometer is higher than the current vehicle reading.
- Shared dialogs and modals now stay within the viewport and scroll correctly on mobile and desktop.

### Changed

- The maintenance schedule page now has a compact status summary and a dedicated history-only view when opening "View history" from the maintenance list.
- The global History page now includes maintenance, fuel fill-ups, and manual odometer updates in one timeline.
- Vehicle detail HU/AU and insurance panels are compact by default and expand only when adding or editing details. Insurance policies can now be edited instead of duplicated.
- Vehicle detail notes now appear above the vehicle modules.
- Notification settings no longer show the long background-delivery explainer, provider credentials are masked, and Pushover/Telegram settings are collapsible.
- The dashboard now shows a compact vehicle status card with next inspection, current insurance, and recent fill-ups.

### Migrations

- `20260704100000_remove_synthetic_maintenance_history` removes empty auto-derived maintenance records created from schedule baseline fields.
- `20260704101000_odometer_log` adds `OdometerLog` for durable manual odometer-update history.

## [0.9.4] - 2026-07-03

### Fixed

- **Back-dating an old service no longer breaks the maintenance status** — the "last service" for a schedule is now derived from the actual maintenance history (highest odometer, then latest date, then a stable tie-breaker), not from whichever record was inserted most recently. Adding an older service (e.g. an oil change at 130,000 km / 2025 after one already exists at 150,000 km / 2026) keeps the 150,000 km service as the reference and no longer flips the item to "overdue". This central logic is used everywhere the last service or next due is computed (dashboard, maintenance tab, schedule detail, reminders, notifications, history).
- **Creating a schedule with a stated last service now records real history** — when you add a maintenance interval and enter when it was last performed, a full maintenance-history entry is created automatically (date + odometer). It appears immediately in the timeline and drives the next-due calculation, instead of the value living only on the schedule. The schedule, the last service and the history can no longer drift apart.

### Added

- **Back-dated entry hint** — when logging a service that is older than the current last service (by odometer, or by date when no odometer is given), the form now explains that the entry is still saved but won't be used as the last service. Saving an older entry is never blocked.

### Migrations

- `20260703200000_backfill_maintenance_history` — promotes each schedule's stored last-service date/odometer into a real `MaintenanceRecord` for existing installs. Idempotent (schedules that already have history are skipped, so no duplicates) and non-destructive (insert-only). Runs automatically on container start.

## [0.9.3] - 2026-07-03

### Changed

- **Finer background blur control** — the blur slider now works in 0.5px increments (previously 1px), so you can dial in a subtle blur well below the old minimum step. The `UserPreferences.backgroundBlurPx` column is now stored as `Float` instead of `Integer`, so fractional values persist correctly. Existing installs keep their current blur value, now stored as a float.

### Fixed

- **Notification save button is always reachable on mobile** — a sticky save button floats above the content on small screens so you no longer have to scroll all the way to the bottom of the settings form to confirm your changes. The inline save button remains on desktop.
- **More reliable settings persistence** — appearance saves (design preset, background blur) and notification settings saves (including the "last alert sent" timestamps touched by the background worker) are now retried on transient SQLite write locks, matching the protection already in place for general preference saves. A brief lock contention no longer silently drops a save.

### Migrations

- `20260703010000_background_blur_float` — changes `UserPreferences.backgroundBlurPx` from `INTEGER` to `REAL` (float). Runs automatically on container start; existing integer values are preserved as float equivalents (e.g. `8` becomes `8.0`).

## [0.9.2] - 2026-07-03

### Fixed

- **Maintenance alerts no longer fire on every page load** — previously the dashboard triggered a notification check on every render, so visiting the site could send a duplicate alert (especially with the "No minimum interval" option). Alerts are now delivered by a background worker started via Next.js `instrumentation.ts`, completely independent of page visits. The page no longer needs to be open for notifications to arrive.
- **Scheduled delivery window now actually works** — the "Zeitfenster" / scheduled-window setting previously only fired if someone happened to load the dashboard within ±30 minutes of the configured time. The background worker checks every 15 minutes, so alerts respect your chosen weekday/time window, quiet hours, and minimum interval reliably.

### Changed

- **Notification messages now show remaining days and kilometers** — each due/overdue alert line includes how many days and/or kilometers are left until the service is due (or by how much it is already overdue), e.g. `• VW Golf: Oil change — due soon (noch 12 Tage, noch 340 km)`.
- **Self-hosted background delivery** — a single `setInterval` worker (15-minute tick, 30s startup delay, `unref`'d so it never keeps the process alive on its own) iterates all users with notification settings and sends their due/overdue/odometer reminders according to their own delivery rules. No external cron or cloud service required.

### Notes

- No schema migration in this release. Existing notification settings (`minIntervalHours`, `deliveryScheduled`, `scheduledTime`, `scheduledDays`, `quietHours*`, `odometerReminderDays`) already control timing and frequency — they now work as originally intended thanks to the background worker.
- The "Mindestabstand zwischen Benachrichtigungen" / minimum interval setting still limits how often a user can receive a repeat alert (default 6h). Set it to your preferred repeat cadence.

## [0.9.1] - 2026-07-02

### Added

- **Miles as a regional distance unit** — added a Regional setting for kilometers or miles. Smart Garage still stores odometer and maintenance data internally in kilometers, but vehicle mileage, odometer updates, maintenance intervals, due distances, reminders, fuel distance summaries, and relevant form inputs now display and accept the selected unit. Fixes #2.

### Fixed

- **Preferred currency now affects new entries and summaries** — dashboard cost cards, cost analytics, fuel analytics, quick fuel, manual expenses, maintenance logging, and modification forms now use the user's saved currency preference instead of hardcoded EUR labels/defaults where the app is displaying user-entered amounts. Fixes #3.

### Notes

- Includes a small SQLite migration adding `UserPreferences.distanceUnit` with default `km`, so existing Unraid installs keep their current metric behavior until a user changes the setting.

## [0.9.0] - 2026-07-02

### Added

- **Expanded offline vehicle catalog** — the bundled catalog now includes normalized technical specs from the Kaggle Cars Datasets 2025 and Automobile datasets on top of the existing catalog sources. The generated seed now contains 113 manufacturers, 4,033 models, and 1,604 engine configurations with fields such as power, torque, displacement, cylinders, fuel type, seats, and source metadata where available.
- **Smarter model-year dropdowns** — the quick catalog flow now groups consecutive years when the available engine/variant configuration set is unchanged. If a selected year/range has exactly one matching configuration, the app auto-selects it and fills the technical fields immediately.
- **Catalog dataset generator and tests** — added a reproducible Kaggle normalization script plus tests for manufacturer/model dedupe, fuel/electric parsing, year-range grouping, and representative autofill data such as Volkswagen Scirocco.

### Changed

- **Existing Unraid installs receive catalog updates automatically** — container startup now uses a versioned bundled-catalog seed. Existing `/data` databases are updated idempotently on restart instead of only seeding empty catalogs.
- **Catalog choices are deduplicated more aggressively** — manufacturer aliases, duplicate manufacturer names, model names with repeated make prefixes, and placeholder `Standard/Base` entries are folded or hidden when better technical data is available.

### Notes

- No schema migration in this release. Existing installs only need the normal container update/restart path; `prisma migrate deploy` still runs first, then the versioned catalog seed adds missing reference data without touching user vehicles.
- The new Kaggle sources do not contain exact engine-code production spans for every model. When a source lacks exact year ranges, the app imports the best available representative spec and keeps the existing broader model-year catalog data.

## [0.8.2] - 2026-07-02

### Fixed

- **Maintenance reminder settings readable again** — the km/day threshold inputs cut off larger values (e.g. `1500` showed as `15…`) because the field was too narrow and the browser's number spinners overlapped the digits. The fields are now wider, the native spinners are hidden, and the unit label (`km`/`Tage`) sits in reserved padding so the full value is always visible.
- **Settings no longer silently revert** — preference saves (theme, language, currency, timezone, quick fuel, maintenance thresholds) are fired optimistically from the client; a transient SQLite write lock could drop the save while the UI still showed the new value, so it appeared to snap back (e.g. 50 → 30 days) after a reload or redeploy. The write is now retried on lock contention, and failures surface in the console instead of being swallowed.

### Changed

- **SQLite tuned for concurrent access** — the database connection now uses WAL journal mode and a 5s busy timeout. Readers no longer block writers (and vice versa), and brief write locks wait-and-retry instead of immediately failing — markedly more reliable for homelab/Unraid setups where several requests can write at once. This makes all writes across the app (not just settings) more robust.

### Notes

- No schema migration in this release. Existing `/data` databases are picked up as-is; WAL mode is enabled automatically on first connection and persists in the database file. Container updates on Unraid continue to run `prisma migrate deploy` on start (non-destructive; only pending migrations are applied) against the persistent `/data` volume.

## [0.8.1] - 2026-07-02

### Fixed

- **Sidebar version now always current** — the version shown in the sidebar was a hardcoded `v0.1 · Preview` string that never moved. It is now sourced from `package.json` at build time (`NEXT_PUBLIC_APP_VERSION`) and shows the real release (`v0.8.1`), with no "Preview" tag now that the app is in production. Bumping the version in one place updates the sidebar automatically going forward.
- **One source of truth for the version** — the JSON export previously stamped a stale `0.4.4` fallback and the health endpoint reported `unknown` when `APP_VERSION` was absent. Both now use a shared `APP_VERSION` constant derived from `package.json` (or the container's build-time `APP_VERSION`).
- **Shared vehicles show their images and documents** — images and documents of a vehicle shared with you (Family garage) returned 404 because file access was scoped to the owner only. Downloads and inline viewing now follow vehicle access (owner or share), matching the rest of the sharing feature. Deletion stays owner-scoped.

### Security

- **`X-Content-Type-Options: nosniff`** is now sent on the document and vehicle-image file responses, preventing browser MIME-sniffing of stored files (defense in depth on top of the existing upload MIME allow-list).

## [0.8.0] - 2026-07-02

### Added

- **Delete maintenance records** — history/edit view now has a delete action (with confirmation) so an accidentally logged maintenance entry can be removed. Any auto-created expense for that record is removed too; the linked schedule's due status is recalculated. Linked notes/documents are kept (only unlinked).
- **Parts/materials autocomplete** — the maintenance items editor now suggests common brands and specifications per category (engine oil, oil/air/cabin/fuel filters, brake fluid, coolant, spark/glow plugs, brake pads/discs, tires, wipers, battery, transmission/DSG oil, and more), 20+ suggestions where applicable, via native datalists. Custom values are still fully allowed.
- **More design presets** — added Aurora (teal/cyan), Graphite (neutral slate) and Crimson (red) on top of the existing Classic, Space, Forest, Sunset, Midnight and Rose presets, all polished with matching light/dark palettes.
- **Quick fuel is now configurable** — a new "Quick fuel" toggle in Settings (enabled by default, stored per user in the DB). The dashboard widget is collapsible and starts collapsed; your open/closed choice is remembered per device.

### Fixed

- **Theme now database-backed and consistent** — the active theme (light/dark/system) is rendered from each user's DB preference on the server (`data-theme` on `<html>`) and applied before first paint, eliminating the "some parts light, some parts dark" mismatch. Preferences now treat the database as the source of truth (local cache is only a fallback), so theme, language, currency, timezone, quick fuel and maintenance thresholds follow the user across devices instead of relying on cookies/local storage.
- **Design preset color leak** — switching presets no longer bleeds colors into the default theme. Preset palettes are now pure CSS driven by a `data-design` attribute, so "Classic" always stays the true default and switching back is clean.
- **Modifications feature** — editing a modification now works on mobile and desktop (inline edit form), plus add and delete. Power gains are applied correctly (e.g. 180 PS + 100 PS mod = 280 PS shown, factory power preserved) and are no longer wiped when the vehicle is edited.

### Changed

- **Maintenance list ordering** — schedules are now sorted by priority: overdue first, then due-soon, then normal (previously an inconsistent status ordering).
- **Selected design integrates app-wide** — the chosen accent color now subtly tints the main content area's default background, not just buttons and the sidebar.
- **Background blur control** — the blur slider range was widened (0–50 px) for finer, stronger control over custom background images.

### Removed

- **QR code feature** — removed entirely (vehicle QR API route, UI, and the `qrcode` / `@types/qrcode` dependencies). The lockfile was updated accordingly.

### Migrations

- One new migration (`20260702010000_quick_fuel_setting`) adds a `quickFuelEnabled` boolean (default `true`) to `UserPreferences`. It runs automatically on container start — no manual action required; existing data is untouched.

## [0.7.0] - 2026-07-01

### Added

- **Installable PWA (iPhone, Android, desktop)** — Smart Garage can now be added to the home screen / installed as a standalone app from Safari (iOS), Chrome (Android/desktop), and Edge, with its own name, icon, and window (no browser address bar/tabs).
- New web app manifest (`app/manifest.ts`) — `name`, `short_name`, `description`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `orientation: "portrait-primary"`, `background_color`/`theme_color` (`#0f172a`), `categories`, and three icons (192×192, 512×512, and a padded 512×512 maskable variant for Android's adaptive icon masks).
- New dedicated app icon set — a clean car/garage silhouette (no text, unlike the full wordmark logo) generated at every required size: `app/icon.png`, `app/apple-icon.png` (180×180), `app/favicon.ico`, plus the manifest icons under `public/icons/`.
- **Minimal, safety-first service worker** (`public/sw.js`) — unlocks the Chrome/Android "Install app" prompt (which requires an active service worker). It only caches the manifest, favicon, and app icons via stale-while-revalidate; every navigation, `/api/*` call, and RSC payload always goes straight to the network, so login/logout, session cookies, and locale routing are never affected by caching. Registered only in production (skipped in `next dev`) via a small client component.
- **"Install app" settings section** — a new panel on the General settings page with step-by-step instructions for iPhone, Android, and desktop, plus a native "Install Smart Garage" button when the browser offers an install prompt (Chrome/Edge). Already-installed (standalone) visits show a simple "installed" confirmation instead. No install prompt is ever shown automatically — only in response to the button click.
- Minor mobile/app-feel polish: `-webkit-text-size-adjust: 100%` (stops iOS from rescaling text on rotation) and `overscroll-behavior-y: none` on `body` (stops the pull-to-refresh rubber-band bounce when launched standalone).

### Notes

- `start_url` is `"/"`, not a hardcoded locale — the existing next-intl middleware already remembers each visitor's last-used locale, so the installed app always opens in the right language.
- No changes to the notification system: no automatic permission prompts were added, and the existing Pushover/Telegram maintenance alerts are untouched. Browser Push API (VAPID) is not implemented — see limitations below.
- Verified with a Linux Docker build + container run (manifest, icons, `sw.js`, and `/api/health` all return `200`) in addition to `lint`, `typecheck`, `test`, and `build`.

### Limitations / future improvements

- No offline mode — by design, to avoid any risk of stale authenticated pages or API responses; only static branding assets are cached.
- No real Web Push notifications (would need VAPID keys and a new subscription flow) — out of scope for this release; existing Pushover/Telegram channels are unaffected.

## [0.6.0] - 2026-07-02

### Added

- **Parts, fluids & materials tracking on maintenance records** — a maintenance record can now store a structured list of the items actually used (engine oil, oil/air/cabin/fuel filter, spark/glow plugs, brake fluid, coolant, transmission/DSG/differential oil, brake pads/discs/sensor, tires, wipers, battery, belt, gasket, or a free-form "custom" item), each with brand, product name, part number, specification, quantity, unit (liters, milliliters, pieces, sets, kg, grams, custom), cost, supplier/shop, and notes. New `MaintenanceItem` model (one row per used item, owned by a `MaintenanceRecord`).
- **Per-vehicle, per-maintenance-type defaults** — on a schedule's detail page, a new "Defaults" panel lets you define the parts/fluids that are always used for that vehicle + maintenance type (e.g. "Oil change → 5.7 L Motul 8100 Power 5W-40 + Mann Filter HU 6002 z"). New `MaintenanceItemDefault` model, one set per `VehicleMaintenanceSchedule`. Defaults automatically prefill the "Log maintenance" form, remain fully editable per record, and can be saved/updated ("save as new default" checkbox) or cleared independently at any time.
- **Historical snapshots are preserved** — `MaintenanceItem` rows are an independent copy made at record-creation/edit time, not a reference to the default. Changing a schedule's default oil/filter later never rewrites older maintenance records — verified with an end-to-end scripted test (create record → change defaults → confirm the old record still shows the original items, new records use the new defaults).
- **Template-aware suggestions** — the items editor shows quick-add buttons suggesting the relevant categories for the maintenance type being logged (e.g. oil change suggests engine oil + oil filter; brake service suggests pads/discs/sensor/cleaner; tire change suggests tire/size/DOT/pressure), based on the existing maintenance template catalog. Fully generic — any category can still be added manually to any maintenance type.
- **Markdown notes on maintenance records** — the free-text note on a maintenance record is now edited with a small Markdown editor (bold, italic, headings, bullet/numbered lists, links) with a live write/preview toggle, and rendered as safe formatted HTML in the history timeline (a dependency-free renderer that escapes all input and only allows `http(s)` links — no raw HTML is ever stored or rendered).
- **Edit existing maintenance records** — history entries now have an "Edit" action opening a dialog to correct the date, mileage, cost, vendor, notes, and items list of a past record, without needing to delete and re-log it.
- **Maintenance history filters** — the history page gained search (part name, brand, product, part number, notes), plus vehicle, category, and date-range filters, all reflected in the URL.
- **New Notes module** — a dedicated "Notes" item in the sidebar opens a full notes manager: create/edit/delete, search title+content, filter by vehicle/tag/pinned, pin favorites, comma-separated tags, and created/updated timestamps. The editor uses the same Markdown editor as maintenance notes. New `Note` and `NoteTag` models, owned per-user.
- **Notes linking** — a note can be global, or linked to a vehicle, a maintenance type, and/or a specific maintenance record (independently combinable). "Related notes" widgets now appear on the vehicle page and on a maintenance schedule's detail page, pre-filtered to notes relevant to that context, with a "New note" shortcut that pre-links the right vehicle/type.
- Vehicle hub page gained a "Notes" tile showing the linked note count for that vehicle.

### Database

- New enums `MaintenanceItemCategory`, `MaintenanceItemUnit`.
- New models: `MaintenanceItem` (on `MaintenanceRecord`), `MaintenanceItemDefault` (on `VehicleMaintenanceSchedule`), `Note`, `NoteTag` (both owned by `User`, optionally linked to `Vehicle` / `MaintenanceTemplate` / `MaintenanceRecord`).
- Migration `20260701203533_maintenance_items_and_notes` — purely additive (new tables/indexes only); existing vehicles, schedules, and maintenance records are untouched and continue to display normally with an empty items/notes list.

### Notes

- All new server actions and repository queries scope reads/writes to the authenticated user's own vehicles, schedules, records, notes, and tags — a user can never read or modify another user's data (covered by a scripted ownership-isolation test).
- No changes to the notification system's logic; "soon due"/"overdue" thresholds, mileage/date interval computation, and de-duplication are unaffected by this feature.
- All new UI text was added to both `messages/en.json` and `messages/de.json`.

## [0.5.2] - 2026-07-02

### Fixed

- **"This page couldn't load" crash after a stale/invalid session cookie** — if the session cookie referenced a session that no longer existed in the database (e.g. after a `/data` restore, DB reset, or a deactivated account), the app threw an uncaught `UNAUTHORIZED` error while rendering the page. With no error boundary anywhere in the app, this bubbled up to Next.js's generic fatal error page — the only fix was manually deleting cookies. Added `app/[locale]/error.tsx` and `app/global-error.tsx` boundaries: auth errors now automatically clear the stale cookie (via a Server Action, `recoverFromInvalidSession`) and redirect to `/login` with a "Your session has expired, please sign in again" notice; any other unexpected error shows a friendly "try again" card instead of the raw framework error page.
- **Malformed/corrupted session cookies rejected before they reach the database** — `middleware.ts` and `getSessionTokenFromCookies()` now validate that the `sg_session` cookie value matches the exact shape a real session token can have (64 lowercase hex characters). Garbage, truncated, JSON-injected, or otherwise corrupted cookie values are treated as "logged out" and cleared immediately instead of being handed to a database lookup.
- **Defensive fallback for corrupted preference values** — `UserPreferences` rows read from the database (theme, locale, currency, design preset) are now validated against known allow-lists and fall back to sane defaults instead of being cast blindly, matching how localStorage/cookie preference values were already handled.

### Added

- Safe, low-cardinality server-side logging (`[auth] session rejected: …`) for stale/orphaned/expired sessions and deactivated-user logins — logs the reason and route only, never the cookie/token value or other sensitive data.
- Unit tests (new `vitest` setup) covering the session token validator, the preference sanitizers, and maintenance-threshold clamping; wired into CI as a new `Unit tests` step.
- `SESSION_COOKIE_SECURE` documented in `docs/INSTALL.md` with concrete guidance for local IP + Cloudflare/reverse-proxy access.

### Notes

- **No database migration required.** User preferences (theme, locale, notification settings, maintenance thresholds, etc.) were already stored in the database (`UserPreferences`, `UserNotificationSettings`), keyed by user, not in cookies — confirmed during this audit. The only cookie in the app is the `sg_session` auth cookie.
- **No user action required.** Existing valid sessions are unaffected; only sessions that were already broken (and previously required a manual cookie deletion) now recover automatically.

## [0.5.1] - 2026-07-01

### Added

- **Installable app experience (PWA manifest)** — `app/manifest.ts` provides a standalone Web App Manifest so Smart Garage can be added to a phone home screen and launched like a native app (self-hosted use, not app-store/SEO).
- **Safe-area support** — `viewport-fit=cover` plus safe-area padding on the header, mobile sidebar drawer, and main content so the UI no longer sits under the notch or home indicator on modern phones.
- **Mobile web-app metadata** — `appleWebApp` (home-screen launch), `themeColor` (light/dark browser chrome), and `formatDetection: telephone off` (stops iOS turning mileage/VIN numbers into call links).

### Fixed

- **No more accidental zoom on input focus (iOS)** — form controls are forced to 16px on small screens, which prevents iOS Safari's auto-zoom when focusing a field. Pinch-to-zoom stays available for accessibility.
- **Horizontal-scroll guard** — the main content area clips horizontal overflow to avoid stray sideways scrolling on narrow screens.
- **App-like tap feedback** — removed the grey tap-highlight flash on touch devices.

## [0.5.0] - 2026-07-01

### Added

- **Configurable "Soon due" warning thresholds** — the mileage warning (km) and date warning (days) that flip a service into the yellow "Soon due" state are now editable per user under **Settings → General → Maintenance reminders**. Presets (250/500/750/1000/1500/2000 km and 7/14/30/60/90 days) are offered, plus any custom value. Previously these were hardcoded at 30 days / 1,500 km.
- **`getMaintenanceThresholds()`** — lightweight per-user threshold lookup, threaded through the scheduler, repositories, services, and dashboard so status is computed consistently against the user's own settings.

### Changed

- **Centralized maintenance status styling** — all status colors (green OK / yellow Soon due / red Overdue) now come from a single `lib/maintenance/status-style.ts` module. The dashboard cards, maintenance board, schedule detail header, and reminders panel previously each carried their own duplicated color tables; they now share one source of truth for consistent colors everywhere.
- **Scheduler** — `computeNextDue()` and `resolveDueStatus()` accept configurable thresholds (defaulting to the previous 30 days / 1,500 km for backward compatibility).
- **Notifications** — the "Maintenance due soon" event hint now refers to the user's configured warning threshold instead of a fixed "30 days / 1,500 km".

### Database

- `UserPreferences` gains `maintenanceDueSoonKm` (default 1500) and `maintenanceDueSoonDays` (default 30). Migration `20260701192351_maintenance_due_soon_thresholds`.

## [0.4.8] - 2026-06-30

### Fixed

- **Year selection — race condition** — selecting a year in the simple catalog flow now sets `catalogModelYearId` immediately (synchronously), so the form can be submitted right away without waiting for the async engine-disambiguation fetch to complete
- **Engine picker not appearing** — switching the config-fetch effect guard from `catalogModelYearId` to `configsForYear` means the picker now always loads on initial render, including for previously saved vehicles that already have a `catalogModelYearId`; this fixes editing existing catalog vehicles
- **`years-by-series` option id** — the API now returns the actual `CatalogModelYear` row id as the option value (instead of the plain year number), so selecting a year immediately yields a valid catalog reference

## [0.4.7] - 2026-06-30

### Added

- **Intelligent vehicle autofill** — after selecting model + year, the app auto-resolves the catalog configuration: if there is only one option (e.g. bundled catalog), specs are filled automatically; if multiple engines exist, an engine/PS picker is shown
- **Manufacturer alias search** — typing "VW", "MB", "Mercedes", "Merc", "Benz", "Chevy", "Alfa", etc. now resolves to the correct manufacturer
- **Catalog detail fields** — `doors`, `seats`, `cylinders`, `valves`, `aspiration` stored from cardata.wiki; passed through to vehicle factory and current specs
- **Additive catalog import** — cardata.wiki import now fills-null-only (no more destructive delete on re-import); new `replaceExisting: true` flag to force a clean reimport
- **New API** — `/api/catalog/configs-by-year?seriesId=&year=` returns all engine configurations for a given model + year, enabling disambiguation

### Changed

- Validation no longer requires `generationId`/`variantId`/`engineId` when a `catalogModelYearId` is present (simplified catalog flow fills them automatically)
- `years-by-series` API now returns the production year as the option `id` (instead of a random `CatalogModelYear` cuid) — enables correct year-to-config lookup

## [0.4.6] - 2026-06-19

### Added

- **Service anpassen** on maintenance detail pages — edit interval, last service date, and odometer
- **Simplified vehicle catalog** — after choosing model, pick production year directly (individual years)
- **Catalog API** — `/api/catalog/years-by-series` for year lists per model

### Fixed

- **Bundled vehicle catalog** — regenerated from open-vehicle-db + cardata; correct production years per model (e.g. VW Scirocco no longer shows a single `1990–2026` range)
- **Catalog seeding** — generations split at production gaps; bundled dataset version bumped

## [0.4.5] - 2026-06-20

### Added

- **Reminders quick setup** — wizard to walk through warnings with exact date, circa (~3/6/12/24 months), estimate, later, or skip
- **Inline interval editing** on Reminders and Maintenance pages (km, months, last service)

## [0.4.4] - 2026-06-20

### Fixed

- **Docker smoke test / container startup** — Next.js standalone traced `prisma.config.ts` into the image; Prisma CLI failed with `Cannot find module 'prisma/config'`. Excluded from standalone trace, removed in Dockerfile, and stripped in entrypoint.
- **API auth** — protected routes return 401 instead of 500 when unauthenticated
- **ESLint** — zero warnings; unused imports cleaned up
- **Docker** — HEALTHCHECK in Dockerfile and docker-compose
- **`csv-parse`** moved to devDependencies (catalog import scripts only)

## [0.4.3] - 2026-06-20

### Fixed

- **Container startup crash** — `prisma.config.ts` was copied into the production image but the `prisma` npm package was not; Prisma CLI failed with `Cannot find module 'prisma/config'`. Production now uses `prisma migrate deploy --schema=./prisma/schema.prisma` without the dev config file.

### Added

- **Docker smoke test** — `scripts/docker-smoke.sh` builds the image, runs migrations + catalog seed, and checks `/api/health` in CI before any image is pushed to GHCR.

## [0.4.2] - 2026-06-20

### Fixed

- **GitHub Actions / Unraid updates** — `package-lock.json` regenerated with npm 10 (CI uses npm 10, lockfile was npm 11); all workflows green again
- **`:latest` stable image** — republished on tag `v0.4.2` (tags `v0.4.0` / `v0.4.1` never built because CI failed before Docker publish)
- **ESLint** — odometer quick-update no longer triggers `set-state-in-effect`

## [0.4.1] - 2026-06-19

### Fixed

- **Slow/hanging catalog seed on first start** — batch SQLite writes (~31k model years in ~30–60s instead of many minutes); progress logged per manufacturer in container console
- **Prisma deprecation warning** — moved seed config from `package.json` to `prisma.config.ts`

## [0.4.0] - 2026-06-19

### Added

- **Manual vehicle entry** — add make/model manually when a vehicle is not in the catalog
- **Odometer quick-update** — update mileage from the dashboard and vehicle detail page
- **TÜV / HU & AU tracking** — inspection due dates with reminders
- **Cost overview** — new `/costs` page with monthly trends, category and vehicle breakdown
- **QR code per vehicle** — scannable link to the vehicle detail page
- **Family garage** — share vehicles with other users (viewer or editor access)
- **Insurance tracker** — policies, SF class, premiums, and renewal dates per vehicle
- **Wishlist** — planned purchases, dream cars, and parts with status workflow
- **Export & backup** — JSON full backup and expenses CSV from Settings → Data & export
- **Design presets** — Classic, Space, Forest, Sunset, Midnight, Rose color themes
- **Configurable background blur** — adjustable blur strength (0–24 px) when using a custom background

### Changed

- Vehicle lists and dashboard now include shared family-garage vehicles
- Settings navigation adds **Data & export** section
- Sidebar navigation adds **Cost overview** and **Wishlist**

## [0.3.6] - 2026-06-20

### Fixed

- **Empty vehicle catalog on Unraid/Docker** — seed bundled manufacturer catalog on first container start; manufacturer search no longer requires CARDATA_WIKI-only data

## [0.3.5] - 2026-06-20

### Fixed

- **Session on HTTP and HTTPS** — default cookies work on both without configuration; optional `SESSION_COOKIE_SECURE=auto` for HTTPS-only secure cookies behind a reverse proxy; logout clears both cookie variants

## [0.3.4] - 2026-06-20

### Fixed

- **Login session lost on navigation** — session cookies no longer require HTTPS by default; fixes logout loop on Unraid when using `http://` on the LAN. Set `SESSION_COOKIE_SECURE=true` only behind HTTPS.

## [0.3.3] - 2026-06-20

### Fixed

- **Container startup** — `prisma: not found` on Unraid/CA install; install Prisma CLI globally in the image and run `prisma migrate deploy` at boot

## [0.3.2] - 2026-06-20

### Fixed

- **GitHub Actions `npm ci`** — Linux-synced `package-lock.json` (optional deps `@emnapi/*`, `@swc/helpers`)
- **Docker image build** — `npm ci --ignore-scripts` in Dockerfile deps stage so Prisma postinstall does not run before `schema.prisma` is copied
- **`:latest` stable image** — republished so Unraid and GHCR stable channel match the green CI build

## [0.3.1] - 2026-06-19

### Fixed

- **CI failures** — resolved ESLint errors (`set-state-in-effect`, unsafe optional chaining) that blocked all GitHub Actions runs

### Changed

- **Two Docker channels:**
  - `:development` — built on every `main` push (after CI passes)
  - `:latest` — stable channel, only on version tags `v*` (after CI passes)
- Docker publish workflow now runs lint/build before pushing any image
- Unraid template stays on `:latest` (safe default)

## [0.3.0] - 2026-06-19

### Production release

First public production release for Unraid Community Applications and self-hosting.

### Added

- Polished GitHub README with project purpose, features, and install guides
- [docs/INSTALL.md](./docs/INSTALL.md) — backup, restore, updates
- [docs/CA-SUBMISSION.md](./docs/CA-SUBMISSION.md) — complete CA submission packet for moderators
- `/api/health` returns app `version`
- `.dockerignore` for leaner image builds
- GitHub issue templates

### Changed

- **Production focus:** removed internal dev docs, dev compose, AI agent files, and Next.js default assets
- Docker Compose pulls pre-built `ghcr.io/flizzy27/smart-garage:latest` (no local build required)
- GHCR workflow publishes `latest` on every `main` push and on version tags (auto-updates on Unraid)
- Cleaned `.env.example` — production variables only, no PostgreSQL leftovers
- Updated SECURITY.md and CONTRIBUTING.md for production accuracy

### Removed

- `docker-compose.dev.yml`, planning docs (ARCHITECTURE, ROADMAP, etc.), dev probe scripts

## [0.2.1] - 2026-06-19

- Unraid CA template, GHCR publish workflow, named Docker volume

## [0.2.0] - 2026-06-19

- Full application: auth, vehicles, maintenance, fuel analytics, Docker

## [0.1.0] - 2026-06-19

- Initial Next.js scaffold

[Unreleased]: https://github.com/flizzy27/smart-garage/compare/v0.4.6...HEAD
[0.4.6]: https://github.com/flizzy27/smart-garage/compare/v0.4.5...v0.4.6
[0.4.5]: https://github.com/flizzy27/smart-garage/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/flizzy27/smart-garage/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/flizzy27/smart-garage/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/flizzy27/smart-garage/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/flizzy27/smart-garage/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/flizzy27/smart-garage/compare/v0.3.6...v0.4.0
[0.3.6]: https://github.com/flizzy27/smart-garage/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/flizzy27/smart-garage/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/flizzy27/smart-garage/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/flizzy27/smart-garage/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/flizzy27/smart-garage/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/flizzy27/smart-garage/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/flizzy27/smart-garage/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/flizzy27/smart-garage/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/flizzy27/smart-garage/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/flizzy27/smart-garage/releases/tag/v0.1.0

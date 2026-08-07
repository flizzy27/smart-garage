# Live fuel prices

Smart Garage can show the current pump prices of filling stations around you,
with a radius search, your preferred grade, sorting and auto-refresh.

The feature is **optional** and **off until you add a free API key**. Without a
key the page simply explains how to get one — nothing else in the app changes.

---

## What it can and cannot show

Prices come from **[Tankerkönig](https://creativecommons.tankerkoenig.de)**,
which republishes the data every German filling station is legally required to
report to the Bundeskartellamt (the *Markttransparenzstelle für Kraftstoffe*,
MTS-K).

| | |
|---|---|
| **Coverage** | Germany only — around 15,000 stations |
| **Grades** | **Super E5**, **Super E10**, **Diesel** |
| **Not available** | Super Plus, LPG, CNG, AdBlue, electricity |
| **Radius** | up to 25 km |
| **Licence** | CC BY 4.0 — the app credits Tankerkönig on the page |

Super Plus and the other grades are missing because the reporting law does not
cover them. No data source exists for them, so Smart Garage does not offer a
selector that would show a blank or a guess.

Outside Germany the radius search simply returns no stations. The **Fuel
calculator** page works everywhere and needs no key at all.

---

## Getting a key

1. Go to **<https://onboarding.tankerkoenig.de/>** and fill in the form: name,
   email, and a category (for a self-hosted garage, *home automation* or
   *website* fits).
2. Keys are personal. Petroleum companies, filling stations and their IT
   providers are excluded by Tankerkönig's terms.

> ### ⏳ Expect to wait
>
> **Every registration is reviewed by hand** to keep the free service clean.
> The key is sent **by email after that review** — often a few days, and up to
> about a week.
>
> Nothing is wrong in the meantime. The Fuel prices page will keep showing the
> setup instructions until a key is entered; come back and paste it in when the
> email arrives.

---

## Adding the key

There are two ways, and **either one works**. If both are set, the one entered
in the app wins — so you can override a container-level key without editing the
container.

### In the app (no restart)

1. **Settings** → **Fuel prices**.
2. Paste the key and **Save**.

This is the easier route when the key arrives days later: no container edit, no
restart, and it takes effect immediately.

The key applies to the whole installation — a Tankerkönig key is issued per
application, not per person — so **only an administrator can change it**. On a
single-user install that is the account that registered first. Everyone else
sees the status but not the field.

### Unraid template

1. **Docker** → **smart-garage** → **Edit**.
2. Find **Fuel prices: Tankerkönig API key** and paste your key.
3. **Apply**. The container restarts and the **Fuel prices** page works.

### Docker Compose

```yaml
environment:
  - TANKERKOENIG_API_KEY=your-key-here
```

Or put it in an `.env` next to `docker-compose.yml`:

```
TANKERKOENIG_API_KEY=your-key-here
```

### docker run

```bash
-e TANKERKOENIG_API_KEY=your-key-here
```

---

## How to use it

Open **Fuel prices** in the sidebar.

| | |
|---|---|
| **Location** | Tap **Use my location**, or type a town, postcode or address |
| **Radius** | Slider, up to 25 km (15 mi) |
| **Grade** | E5 / E10 / Diesel — remembered per device |
| **Sorting** | Cheapest first or nearest first |
| **Filters** | Only open stations, and by brand |
| **Refresh** | Manual button, or auto-refresh every 5–60 minutes |
| **Overview** | Cheapest, average, dearest, spread, and what the spread is worth on one fill-up |

Every section is collapsible, and both the open/closed state and your settings
are remembered on the device.

The **Use in calculator** button on a station drops that price straight into the
**Fuel calculator** page. It is only offered when your display currency is EUR,
because the pump prices are euro and relabelling them would be wrong.

---

## Privacy

- Your location stays on your device and in the request to your own server.
- The server calls Tankerkönig with **coordinates and a radius only** — no
  account, no device id, nothing identifying.
- Address search uses OpenStreetMap's Nominatim, proxied through your server so
  your browser never contacts it directly.
- Nothing about the lookup is written to the database. The only thing stored is
  the API key itself, when you enter it in the app.
- The key is never sent to the browser. The settings page only ever shows a
  masked form of it (`abcd••••••••wxyz`).

---

## Route planner (fuel calculator)

The **Fuel calculator** page has a *Plan a route* section that uses the same
address search, plus road distances from the public
[OSRM](https://project-osrm.org/) demo server. It needs **no key** and works
outside Germany.

- Start from your device location (one tap) or type it, with suggestions as you
  type.
- The resulting distance can be dropped straight into the trip calculation.
- If the routing service is unreachable, the straight-line distance is shown
  and **labelled as such** — a straight line is typically 20–30% shorter than
  the road, so it is never passed off as a driving distance.

OSRM's demo server is best-effort and rate-limited, so routes are cached for an
hour and the address search is debounced.

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Page shows the setup instructions | No key yet. Add it under Settings → Fuel prices, or set `TANKERKOENIG_API_KEY` and restart the container. |
| No key has arrived yet | Normal — registrations are reviewed by hand, which takes days. See the notice above. |
| "The API key was rejected" | Typo, or the key was revoked. Check it at Tankerkönig. |
| "That does not look like a Tankerkönig key" | The field expects the UUID on its own, e.g. `00000000-0000-0000-0000-000000000002` — not the whole line from the email. |
| The field is not editable | Only an administrator can change an installation-wide key. |
| **Use my location** says HTTPS is required | Browsers only hand out GPS on a secure origin. Reaching the app over `http://<nas-ip>:3000` blocks it — use the address search, or put the app behind HTTPS. |
| "Too many requests" | Tankerkönig's rate limit. Wait a minute; repeated refreshes within a minute are served from the local cache anyway. |
| No stations at all | Outside Germany, or the radius is too small. Try 25 km. |
| Prices look stale | They are whatever the station last reported. Auto-refresh has a five-minute floor, as Tankerkönig's terms request. |

---

## Fair use

Tankerkönig is a free, best-effort service. Smart Garage keeps to its terms:

- Radius results are cached for **60 seconds** per location, so repeated manual
  refreshes do not reach the API.
- Identical requests made at the same moment are answered by one upstream call.
- Auto-refresh cannot be set below **5 minutes**, and pauses while the browser
  tab is in the background.
- The data is credited on the page, as CC BY 4.0 requires.

Please do not work around these — a handful of self-hosters abusing a free
service is how it stops being free.

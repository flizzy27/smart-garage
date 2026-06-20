# Smart Garage — Product Vision

Smart Garage ist eine selbst gehostete Fahrzeugverwaltungsplattform.

## Ziel

Digitale Fahrzeugverwaltung mit Serviceheft, Kostenübersicht, Dokumentenverwaltung und intelligenten Wartungsintervallen.

## Technologie

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Docker
- Unraid kompatibel

## V1 Funktionen

### Benutzer

- Registrierung
- Login
- Mehrere Benutzer
- Admin Rolle

### Fahrzeuge

- Marke
- Modell
- Baujahr
- FIN
- HSN
- TSN
- Kennzeichen
- Motor
- Leistung
- Kraftstoff
- Fahrzeugbild

### Wartungen

- Ölwechsel
- Bremsen
- Bremsflüssigkeit
- HU
- AU
- Getriebeöl
- Luftfilter
- Individuelle Wartungen

Jede Wartung:

- Datum
- Kilometerstand
- Kosten
- Notiz
- Dokumente

### Dashboard

- Nächste Wartungen
- Überfällige Wartungen
- Fahrzeugübersicht
- Kostenübersicht

### Design

- Dark Mode
- Light Mode
- Anpassbare Akzentfarbe
- Anpassbares Hintergrundbild

### Deployment

- Docker
- Unraid

### Internationalization

- English (default UI language)
- German (fully supported from day one)
- User-selectable language in settings
- All UI text translatable — no hardcoded strings

### Regional

- Metric system first (kilometers, liters)
- European vehicle identifiers (FIN, HSN, TSN)
- Configurable timezone, date and time format

---

**See also:** [README.md](./README.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) · [DEVELOPMENT.md](./DEVELOPMENT.md)

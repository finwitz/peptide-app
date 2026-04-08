# PeptideCalc Roadmap

## v1.0 — MVP (Complete)
- [x] Reconstitution calculator (6 syringe types, dose warnings)
- [x] Peptide library (65 compounds, 14 categories, search)
- [x] Protocol management (CRUD, start/end dates)
- [x] Dose logging with injection site rotation (8 sites, 7-day rest tracking)
- [x] Peptide detail screens (dosing, cycling, side effects, storage)
- [x] Dark/light theme with system matching
- [x] Offline-first SQLite database with schema migrations
- [x] EAS build config for Android/iOS

## v1.1 — "The Smart Tracker" (Complete)

| Feature | Priority | Status |
|---|---|---|
| Half-life decay curves | P0 | Done |
| Inventory management | P0 | Done |
| Dose history & analytics | P0 | Done |
| RevenueCat integration | P0 | Deferred |
| Apple Health + Google Health Connect | P1 | Deferred |
| Home/lock screen widgets | P1 | Deferred |
| Cloud sync (Supabase) | P1 | Deferred |

### Implemented
- `DecayCurveChart` — SVG multi-dose stacking, "now" indicator, gradient fill
- `AdherenceRing` — circular progress with color-coded thresholds
- Inventory tracking — vial CRUD, progress bars, expiration badges, low-stock indicators
- Analytics — adherence %, streaks (current/best), weekly summaries, period filters
- Enhanced dose log — period tabs (Today/7d/30d/All), grouped timeline, stats card

### Previously Missing — Now Complete
- [x] Inventory auto-deduct on dose log (vial picker UI on log screen)
- [x] Expiring/low-stock inventory alerts on Protocols tab
- [x] Protocol editing (full edit screen with all fields)

## v1.2 — "The AI Companion" (Complete)

### Implemented
- Interaction checker — 27 curated interactions, severity levels, pairwise checking
- Interaction warnings — integrated into protocol creation and detail screens
- Protocol templates — 14 templates across 8 categories, one-tap creation
- AI dosing assistant — local keyword engine, intent classification, 50+ aliases, chat UI tab
- Tests: 61 passing (analytics 12, calculator 23, interactions 10, assistant 13, format 3)

### Deferred to v2.0
- [ ] Vial scanner (camera OCR for vial labels)
- [ ] Bloodwork tracking

### Previously Missing — Now Complete
- [x] Dose reminder notifications (expo-notifications + UI on protocol detail)
- [x] Data export (CSV/JSON via expo-file-system + expo-sharing)
- [x] Protocol editing screen (full edit modal)
- [x] Protocol end-date visual indicators (days remaining, cycle complete badges)

## v1.3 — Polish & Infrastructure (Planned)
- [ ] Onboarding/first-run flow
- [ ] RevenueCat integration (Free/Pro/Premium tiers)

## v2.0 — "The Platform" (Planned)
- [ ] Community protocols
- [ ] Progress photos
- [ ] Titration planner
- [ ] Provider PDF reports
- [ ] Multi-language support
- [ ] Apple Watch / WearOS companion
- [ ] Apple Health + Google Health Connect sync
- [ ] Cloud sync (Supabase)
- [ ] Home/lock screen widgets

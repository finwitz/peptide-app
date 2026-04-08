# PeptideCalc

Cross-platform peptide calculator, tracker, and companion app built with Expo (React Native) + TypeScript.

## Architecture

```
peptide-app/
  app/                              # Expo Router (file-based routing)
    (tabs)/
      index.tsx                     # Reconstitution calculator
      protocols.tsx                 # Protocol management + inventory alerts
      assistant.tsx                 # AI peptide Q&A (local engine)
      log.tsx                       # Dose timeline + analytics + export
      library.tsx                   # 65-peptide searchable library
    protocol/
      new.tsx                       # Create protocol
      edit.tsx                      # Edit protocol
      [id].tsx                      # Protocol detail + decay curves + reminders
      templates.tsx                 # Browse 14 protocol templates
      template-detail.tsx           # Template detail + one-tap creation
    log/
      [protocolId].tsx              # Log dose + site rotation + vial deduct
    peptide/
      [id].tsx                      # Peptide info (dosing, cycling, sides)
    inventory/
      index.tsx                     # Vial inventory list
      add.tsx                       # Add vial form
    _layout.tsx                     # Stack navigator config
  components/
    charts/
      DecayCurveChart.tsx           # SVG half-life decay visualization
      AdherenceRing.tsx             # SVG circular progress indicator
    AssistantMessage.tsx            # Structured AI response cards
    InteractionWarning.tsx          # Drug interaction warnings
  lib/
    calculations.ts                 # Reconstitution math, decay modeling
    calculations.test.ts            # 23 tests
    database.ts                     # SQLite schema, CRUD, migrations
    analytics.ts                    # Adherence, streaks, weekly summaries
    analytics.test.ts               # 12 tests
    interactions.ts                 # 27 curated peptide interactions
    interactionChecker.ts           # Pairwise interaction checking
    interactionChecker.test.ts      # 10 tests
    assistant.ts                    # Local NLP query engine (no LLM API)
    assistant.test.ts               # 13 tests
    protocolTemplates.ts            # 14 pre-built protocol templates
    notifications.ts                # expo-notifications scheduling
    export.ts                       # CSV/JSON export via expo-sharing
  constants/
    theme.ts                        # Light/dark colors, spacing, typography
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo SDK 54, React Native 0.81.5 |
| Language | TypeScript (strict) |
| Navigation | expo-router (file-based) |
| Database | expo-sqlite with WAL mode |
| Charts | react-native-svg (hand-rolled) |
| Notifications | expo-notifications |
| Export | expo-file-system + expo-sharing |
| Haptics | expo-haptics |
| Build/Deploy | EAS Build + EAS Update |

## Database Schema

6 tables with `PRAGMA user_version` migration tracking (currently v3):

- **peptides** — 65 compounds across 14 categories with dosing, half-life, cycling, side effects, storage
- **protocols** — user-created dosing protocols with reconstitution info
- **dose_logs** — timestamped dose entries with site, notes, side effects, inventory linkage
- **injection_sites** — 8 rotation sites with last-used tracking
- **reminders** — per-protocol daily notification schedules
- **inventory** — vial tracking with mg remaining, expiration, source, lot number

## Features

### Calculator
- 6 syringe types (U-100 1mL/0.5mL/0.3mL/0.2mL, U-40, tuberculin)
- mcg/mg toggle, dose warnings (exceeds capacity, too small to measure)
- Doses per vial calculation

### Protocol Management
- Create, edit, delete protocols with full dosing parameters
- 14 one-tap templates (healing stacks, GLP-1 titration, GH secretagogues, cognitive, etc.)
- End-date tracking with "days remaining" and "cycle complete" indicators
- Interaction warnings when adding protocols that conflict with active ones
- Daily dose reminders via push notifications

### Dose Logging
- Injection site rotation with 7-day rest tracking (green/yellow/red)
- Smart site suggestions based on rotation history
- Vial auto-deduction from inventory on each log
- Period filters (Today / 7d / 30d / All) with adherence stats

### Analytics & Visualization
- Half-life decay curves with multi-dose stacking
- 30-day adherence rings (color-coded thresholds)
- Current and best streak tracking
- CSV and JSON data export

### Inventory
- Track active vials with mg remaining, expiration, source, lot number
- Progress bars with stock-level colors
- Expiring-soon and low-stock alert banners on Protocols tab

### AI Assistant
- Local keyword-based query engine (no LLM API required)
- Intent classification: dosing, side effects, cycling, storage, comparison, interaction
- 50+ peptide aliases (brand names, abbreviations, common misspellings)
- Suggested query chips on welcome screen

### Library
- 65 peptides across 14 categories
- Full detail screens: dosing ranges, half-life, cycling protocol, side effects, storage
- Search by name or category

## Development

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run tests (61 tests across 4 suites)
npx jest

# Type check
npx tsc --noEmit

# EAS build (Android development)
eas build --platform android --profile development
```

## Test Coverage

| Suite | Tests | Coverage |
|-------|-------|----------|
| calculations | 23 | Reconstitution, decay, syringe types, warnings, formatting |
| analytics | 12 | Adherence, streaks, weekly summaries, edge cases |
| interactionChecker | 10 | Pairwise checks, severity sorting, single peptide lookup |
| assistant | 13 | Intent classification, alias resolution, response builders |
| **Total** | **61** | All passing |

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for version history and planned features.

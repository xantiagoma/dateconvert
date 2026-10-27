# Redesign parity (2026-10-26)

Baseline: `main` at 3fc5e95 (Next 12, antd 4, Day.js, spacetime, timezone-soft).
New stack: Bun + React 19 + Temporal polyfill, shadcn/ui on Base UI.

Evidence key: **T** = `bun test` (src/lib/*.test.ts), **B** = checked by hand in
Chrome against the production build (`bun run preview`), light/dark, 320/390/1440 px.

| Capability (baseline) | Where now | Evidence |
| --- | --- | --- |
| Start at current instant | `initialState` (store.tsx), Use now button | B |
| Detect local zone | `guessTimeZone` via tiempo `browserTimezone` | B |
| Initial comparisons: local + America/New_York | `initialState`, deduplicated | B |
| Searchable source selector | Source popover + `TimezonePicker` | B |
| Change source, keep instant | `setSourceZone`; card pin button | B (Bogotá → New York kept 06:30Z) |
| Date + time picker | Date field + `MonthCalendar` popover, Time field | B (picking Oct 31 kept 15:56:30.553) |
| Edit Unix seconds | `RepresentationField` + `parseUnixSeconds` | T, B |
| Edit Unix milliseconds | `parseUnixMilliseconds` | T, B (fixture → all fields match) |
| ISO 8601 (was display only) | Now editable, `parseIsoInstant`, offsets accepted | T, B |
| Default format `day.format()` | "Date with offset" (editable) + "Day.js default format" in More formats | T |
| "UTC Person" `toString()` | "UTC date (RFC 7231)" in More formats | T |
| Custom pattern + preview | `FormatEditor`, per-zone previews, presets | T (original pattern, ordinals, ms, z, UTCZ) |
| Day.js token link | Format guide dialog + link to day.js docs | B |
| Multiple zones, add/remove | Add timezone popover, card remove | B |
| Alias search (`soft`), many results | `searchZones` | T (CST lists Shanghai, Chicago, Mexico City) |
| Empty search result | `CommandEmpty` message | B |
| Zone name + IANA | Card title + IANA line | B |
| ISO per zone | Card details "ISO (local)" | B |
| Custom format per zone | Custom format section, one preview per zone | B |
| Show/hide details | Details switch | B |
| hasDST | "Observes DST" (rules of the selected year) | T |
| isDST | "DST at this date" | T (London Oct 26: observes, not active) |
| Hemisphere | spacetime `hemisphere()` | T |
| Standard / daylight names | timezone-soft names, abbreviations, offsets | B |
| Responsive layout | 4/2/1 columns; header compacts on mobile | B (no horizontal scroll at 320/390) |

## New behavior

- Drafts: invalid text never changes the instant; errors show on Enter/blur;
  Esc restores; valid text syncs on every keystroke without reformatting.
- DST gap (NY 2026-03-08 02:30): rejected, both candidates offered. Fold (NY
  2026-11-01 01:30): first occurrence by default, offset chooser shown. T, B.
- Milliseconds are kept across zone changes; seconds show whole seconds plus a
  note. T, B.
- RFC 9557 field with bracketed zone (editable).
- Light / dark / system theme, applied before first paint.

## Added after the first review (2026-10-26)

| Feature | Where | Evidence |
| --- | --- | --- |
| Custom format input (reverse parsing) | `parseCustom` (lib/pattern.ts), editable previews | T (round-trips, weekday/zone checks, DST), B (Tokyo `2027-Jan-01 09:15` → 00:15Z) |
| date-fns syntax via tiempo, localized | `formatCustom`, syntax toggle | T, B (es-CO: “jueves 31 de diciembre de 2026”) |
| Token autocomplete, DnD pieces, palette | `PatternEditor` | B (suggestions with examples, Enter inserts, Alt+→ and drop reorder) |
| Intl styles, zone names, relative, builder | `IntlSection` (lazy) | T (lib/intl.test.ts), B |
| Sectioned date/time with ↑/↓, time picker, month/year jump | `SectionedField`, `TimePicker`, `MonthCalendar` | T (lib/segments.test.ts), B |
| 12/24-hour clock, Auto by locale | `clock` preference | T |
| Live mode | store `live` + `tick` | T, B (advances each second, stops on edit) |
| Shareable URL, saved preferences, reset | lib/url-state.ts, store persistence | T, B |
| Default zones: local + New York, London, Tokyo | `defaultZones` | T |

Day.js' tz plugin returns shifted values for `X`/`x` outside UTC; formatPattern
substitutes the true epoch values (regression test in time.test.ts).

## Deliberate differences

- The old `dayjs.tz` fallback for unknown zones is gone: unsupported zones are
  marked "Not supported" in search and cannot be added.
- Zone colors/tags were decorative and are replaced by plain hierarchy.
- The keyboard shortcuts in the mockups are not implemented and not shown;
  ↑/↓ section stepping and pattern autocomplete keys are documented in place.
- The map variant is deferred (MAP_VARIANT.md).

## Known limitations

- Main JS chunk is 1007 KB minified (331 KB gzip): react-dom, Base UI, the
  Temporal polyfill, timezone-soft and spacetime are the bulk. The Intl section
  and format guide load as separate chunks on demand.
- `bun dev` fails to boot in a browser with a dark-mode extension that injects
  `<link rel="stylesheet">` without `href` (Bun HMR client bug). The production
  build is unaffected.
- Accessibility was checked for labels, aria-invalid, focus and keyboard use of
  search; no screen-reader or 200% zoom pass yet.

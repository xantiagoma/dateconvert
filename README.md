# DateConvert

One moment, every format. Edit a date as Unix seconds, Unix milliseconds,
ISO 8601, a wall-clock time in any IANA timezone, or an RFC 9557 string, and
every other representation updates.

## [dateconvert.vercel.app](https://dateconvert.vercel.app/)

- Editable, synced representations: date + time in a source zone, date with
  offset, Unix seconds (up to 3 decimals), Unix milliseconds, ISO 8601 (UTC),
  RFC 9557 with a bracketed zone.
- Explicit DST handling: skipped wall times are rejected with both candidates
  offered, and a repeated time lets you pick the offset.
- Compare any number of zones, with DST facts for the selected date,
  hemisphere, and standard/daylight names. Search by city, IANA name or
  abbreviation (ambiguous ones like `CST` list every match).
- Date and time fields work by sections: type, pick (calendar, time
  columns), or put the caret on a section and use ↑/↓. 12/24-hour clock
  (Auto follows the locale).
- Custom formats in two syntaxes, both editable in both directions: Day.js
  tokens (the original) or date-fns tokens via tiempo on Temporal, localized.
  Token autocomplete with live examples, drag-and-drop pieces and a palette.
- Intl section: dateStyle/timeStyle, zone-name styles, calendars, numbering
  systems, hour cycles, relative time and an options builder with code.
- Live mode follows the clock; any edit stops it.
- Shareable URL (`?t=…&tz=…&zones=…`); preferences persist locally, with
  reset buttons.
- Light, dark and system themes.

## Development

```sh
bun install
bun dev          # dev server with HMR on http://localhost:3000
bun test         # parsing, DST and zone-search tests
bun run typecheck
bun run build    # static site in dist/
bun run preview  # build, then serve dist/ (PORT=4418 to change the port)
```

Built with Bun, React, [Temporal](https://tc39.es/proposal-temporal/)
(`@js-temporal/polyfill`, [`@xtandard/lib/temporal`](https://github.com/xantiagoma/xtandard),
[`@gobrand/tiempo`](https://tiempo.gobrand.app/),
[`@gobrand/react-calendar`](https://calendar.gobrand.app/)), timezone-soft,
spacetime, Day.js and shadcn/ui on Base UI. Hosted on Vercel.

## Deploying

Static build on Vercel (`vercel.json`): Bun is detected from `bun.lock`,
`bunVersion` pins it, and `dist/` is served as static files. The dev server's
`Bun.serve()` HTML imports are not used in production (Vercel functions do not
support them, and this app needs no backend).

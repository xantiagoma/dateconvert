import {Temporal} from '@js-temporal/polyfill';
import {instantToDate} from '@xtandard/lib/temporal';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import spacetime from 'spacetime';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);

export {Temporal};

export const DEFAULT_PATTERN = 'dddd MMMM Do YYYY hh:mm:ss.SSS A (z: UTCZ)';

/** Result of parsing a text field into the canonical instant. */
export type ParseResult =
  | {ok: true; instant: Temporal.Instant}
  | {ok: false; message: string; gap?: DstGap};

/** Wall-clock time skipped by a DST jump: both candidate instants. */
export type DstGap = {
  before: Temporal.ZonedDateTime;
  after: Temporal.ZonedDateTime;
};

const fail = (message: string, gap?: DstGap): ParseResult => ({
  ok: false,
  message,
  gap,
});

const OUT_OF_RANGE = 'Out of supported range (about ±275,760 years from 1970).';

function instantFromEpochMs(ms: bigint): ParseResult {
  try {
    return {
      ok: true,
      instant: Temporal.Instant.fromEpochNanoseconds(ms * 1_000_000n),
    };
  } catch {
    return fail(OUT_OF_RANGE);
  }
}

export function parseUnixSeconds(text: string): ParseResult {
  const value = text.trim();
  if (!value) return fail('Enter Unix seconds, e.g. 1793025000.');
  const match = /^([+-]?)(\d+)(?:\.(\d*))?$/.exec(value);
  if (!match)
    return fail(
      'Use digits only, optionally with a sign and up to 3 decimals.',
    );
  const [, sign, int, frac = ''] = match;
  if (frac.length > 3) return fail('Up to 3 decimals (millisecond precision).');
  const ms = BigInt(int!) * 1000n + BigInt(frac.padEnd(3, '0'));
  return instantFromEpochMs(sign === '-' ? -ms : ms);
}

export function parseUnixMilliseconds(text: string): ParseResult {
  const value = text.trim();
  if (!value) return fail('Enter Unix milliseconds, e.g. 1793025000000.');
  if (!/^[+-]?\d+$/.test(value))
    return fail('Use whole milliseconds: digits with an optional sign.');
  return instantFromEpochMs(BigInt(value));
}

const LOCAL_ISO =
  /^[+-]?\d{4,6}-\d{2}-\d{2}[T ]\d{2}(:\d{2}(:\d{2}(\.\d+)?)?)?$/i;

/** ISO 8601 / RFC 3339 with `Z` or an explicit offset. */
export function parseIsoInstant(text: string): ParseResult {
  const value = text.trim();
  if (!value)
    return fail('Enter an ISO 8601 instant, e.g. 2026-10-26T14:30:00Z.');
  if (LOCAL_ISO.test(value)) {
    return fail(
      'Add Z or an offset (e.g. -05:00). For a wall-clock time, use the Date and Time fields.',
    );
  }
  try {
    return {ok: true, instant: Temporal.Instant.from(value)};
  } catch (error) {
    if (
      error instanceof RangeError &&
      /outside|range/i.test(error.message) &&
      /^[+-]?\d/.test(value)
    ) {
      return fail(OUT_OF_RANGE);
    }
    return fail('Not a valid ISO 8601 instant, e.g. 2026-10-26T14:30:00.000Z.');
  }
}

/**
 * RFC 9557 date-time with a bracketed IANA zone, e.g.
 * `2026-10-26T09:30:00-05:00[America/Bogota]`. The offset is optional; when
 * present it must agree with the zone's rules.
 */
export function parseZonedDateTime(text: string): ParseResult {
  const value = text.trim();
  if (!value)
    return fail(
      'Enter a date-time with a zone, e.g. 2026-10-26T09:30:00-05:00[America/Bogota].',
    );
  if (!/\[[^\]]+\]$/.test(value)) return parseIsoInstant(value);
  try {
    const zdt = Temporal.ZonedDateTime.from(value, {
      offset: 'reject',
      disambiguation: 'reject',
    });
    return {ok: true, instant: zdt.toInstant()};
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/time ?zone/i.test(message))
      return fail('Unknown timezone in brackets.');
    if (/offset/i.test(message))
      return fail('That offset does not match the zone at this date.');
    return fail('Not a valid RFC 9557 date-time.');
  }
}

export function parsePlainDate(text: string): Temporal.PlainDate | string {
  const value = text.trim();
  if (!/^[+-]?\d{4,6}-\d{2}-\d{2}$/.test(value)) return 'Use YYYY-MM-DD.';
  try {
    return Temporal.PlainDate.from(value, {overflow: 'reject'});
  } catch {
    return 'That date does not exist.';
  }
}

/** Accepts 24-hour (`21:30`) and 12-hour (`9:30 pm`, `9pm`) times. */
export function parsePlainTime(text: string): Temporal.PlainTime | string {
  const value = text.trim();
  const match =
    /^(\d{1,2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?\s*([ap])?\.?\s*(?:m\.?)?$/i.exec(
      value,
    );
  if (!match || (match[2] === undefined && !match[5])) {
    return 'Use HH:mm[:ss[.SSS]] (24-hour) or h:mm[:ss] AM/PM.';
  }
  const [, rawHour, minute = '0', second = '0', ms = '0', meridiem] = match;
  let hour = Number(rawHour);
  if (meridiem) {
    if (hour < 1 || hour > 12) return 'With AM/PM, hours go from 1 to 12.';
    hour = (hour % 12) + (meridiem.toLowerCase() === 'p' ? 12 : 0);
  }
  try {
    return Temporal.PlainTime.from(
      {
        hour,
        minute: Number(minute),
        second: Number(second),
        millisecond: Number(ms.padEnd(3, '0')),
      },
      {overflow: 'reject'},
    );
  } catch {
    return 'That time does not exist (hours 00–23, minutes and seconds 00–59).';
  }
}

export type ClockPreference = 'auto' | 'h12' | 'h23';

/** Whether the locale's default clock is 12-hour (en-US) or 24-hour (es-CO). */
export function localeUses12Hour(locale: string): boolean {
  try {
    const {hourCycle, hour12} = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
    }).resolvedOptions();
    return hourCycle
      ? hourCycle === 'h12' || hourCycle === 'h11'
      : Boolean(hour12);
  } catch {
    return false;
  }
}

export function uses12Hour(clock: ClockPreference, locale: string): boolean {
  return clock === 'auto' ? localeUses12Hour(locale) : clock === 'h12';
}

export type WallTimeResolution =
  | {kind: 'unique'; zdt: Temporal.ZonedDateTime}
  | {
      kind: 'fold';
      earlier: Temporal.ZonedDateTime;
      later: Temporal.ZonedDateTime;
    }
  | {
      kind: 'gap';
      before: Temporal.ZonedDateTime;
      after: Temporal.ZonedDateTime;
    };

/** Resolve a wall-clock date-time in a zone without silently normalizing. */
export function resolveWallTime(
  pdt: Temporal.PlainDateTime,
  timeZone: string,
): WallTimeResolution {
  const like = {
    year: pdt.year,
    month: pdt.month,
    day: pdt.day,
    hour: pdt.hour,
    minute: pdt.minute,
    second: pdt.second,
    millisecond: pdt.millisecond,
    microsecond: pdt.microsecond,
    nanosecond: pdt.nanosecond,
    timeZone,
  };
  const earlier = Temporal.ZonedDateTime.from(like, {
    disambiguation: 'earlier',
  });
  const later = Temporal.ZonedDateTime.from(like, {disambiguation: 'later'});
  if (earlier.epochNanoseconds === later.epochNanoseconds) {
    return {kind: 'unique', zdt: earlier};
  }
  if (Temporal.PlainDateTime.compare(earlier.toPlainDateTime(), pdt) === 0) {
    return {kind: 'fold', earlier, later};
  }
  return {kind: 'gap', before: earlier, after: later};
}

/**
 * Parse a wall-clock date + time in the source zone. Repeated times resolve to
 * the earlier occurrence (the UI exposes the choice); skipped times fail with
 * both candidates so the UI can offer an explicit adjustment.
 */
export function parseWallTime(
  date: Temporal.PlainDate,
  time: Temporal.PlainTime,
  timeZone: string,
): ParseResult {
  let resolution: WallTimeResolution;
  try {
    resolution = resolveWallTime(date.toPlainDateTime(time), timeZone);
  } catch {
    return fail(OUT_OF_RANGE);
  }
  if (resolution.kind === 'gap') {
    const {before, after} = resolution;
    return fail(
      `${time.toString({smallestUnit: 'minute'})} does not exist in ${timeZone} on ${date} (the clocks jump forward).`,
      {before, after},
    );
  }
  const zdt = resolution.kind === 'fold' ? resolution.earlier : resolution.zdt;
  return {ok: true, instant: zdt.toInstant()};
}

/** Two instants share this wall time in the zone (DST fall-back). */
export function foldAlternatives(zdt: Temporal.ZonedDateTime) {
  const resolution = resolveWallTime(zdt.toPlainDateTime(), zdt.timeZoneId);
  return resolution.kind === 'fold' ? resolution : null;
}

const hasSubMillisecond = (zdt: Temporal.ZonedDateTime) =>
  zdt.microsecond !== 0 || zdt.nanosecond !== 0;

/** `2026-10-26T14:30:00.000Z`, keeping sub-millisecond digits when present. */
export function formatIsoUtc(instant: Temporal.Instant): string {
  const zdt = instant.toZonedDateTimeISO('UTC');
  return instant.toString({
    fractionalSecondDigits: hasSubMillisecond(zdt) ? 'auto' : 3,
  });
}

/** `2026-10-26T09:30:00-05:00`, with fractional seconds only when non-zero. */
export function formatOffsetDateTime(zdt: Temporal.ZonedDateTime): string {
  return zdt.toString({timeZoneName: 'never', fractionalSecondDigits: 'auto'});
}

/** `2026-10-26T09:30:00.000-05:00` (milliseconds always shown). */
export function formatLocalIso(zdt: Temporal.ZonedDateTime): string {
  return zdt.toString({
    timeZoneName: 'never',
    fractionalSecondDigits: hasSubMillisecond(zdt) ? 'auto' : 3,
  });
}

export function formatRfc9557(zdt: Temporal.ZonedDateTime): string {
  return zdt.toString({fractionalSecondDigits: 'auto'});
}

export function formatPlainDate(zdt: Temporal.ZonedDateTime): string {
  return zdt.toPlainDate().toString();
}

/** `09:30:00`, or `09:30:00.123` when the instant carries sub-second digits. */
/**
 * `09:30:00`, or `09:30:00.123` when the instant carries sub-second digits;
 * with `h12`, `9:30:00 AM`.
 */
export function formatPlainTime(
  zdt: Temporal.ZonedDateTime,
  h12 = false,
): string {
  const time = zdt.toPlainTime();
  if (!h12) return time.toString({fractionalSecondDigits: 'auto'});
  const hour = time.hour % 12 || 12;
  const rest = time.toString({fractionalSecondDigits: 'auto'}).slice(2);
  return `${hour}${rest} ${time.hour < 12 ? 'AM' : 'PM'}`;
}

export function epochSeconds(instant: Temporal.Instant): string {
  const ms = instant.epochMilliseconds;
  return String(Math.floor(ms / 1000));
}

export function epochMilliseconds(instant: Temporal.Instant): string {
  return String(instant.epochMilliseconds);
}

/** RFC 7231 / `Date#toUTCString`, e.g. `Mon, 26 Oct 2026 14:30:00 GMT`. */
export function formatUtcString(instant: Temporal.Instant): string {
  return instantToDate(instant).toUTCString();
}

/** `UTC−05:00` with a true minus sign. */
export function formatOffset(offset: string): string {
  return `UTC${offset.replace('-', '−')}`;
}

/** Day.js token formatting, preserving the plugins the original app shipped. */
export function formatPattern(
  instant: Temporal.Instant,
  timeZone: string,
  pattern: string,
  /** Format at this fixed UTC offset (minutes) instead of the zone's rules. */
  offsetMinutes?: number,
): string {
  if (pattern === undefined) return formatDayjsDefault(instant, timeZone);
  // Day.js' tz plugin shifts valueOf(), so X and x come out wrong outside UTC:
  // substitute the true epoch values as escaped literals first.
  const ms = instant.epochMilliseconds;
  const safe = pattern.replace(/\[[^\]]*]|X|x/g, (token) =>
    token === 'X'
      ? `[${Math.floor(ms / 1000)}]`
      : token === 'x'
        ? `[${ms}]`
        : token,
  );
  try {
    const date =
      offsetMinutes === undefined
        ? dayjs(ms).tz(timeZone)
        : dayjs(ms).utcOffset(offsetMinutes);
    return date.format(safe);
  } catch {
    return 'Invalid Date';
  }
}

/** Day.js `format()` with no pattern: ISO 8601 with offset, no milliseconds. */
export function formatDayjsDefault(
  instant: Temporal.Instant,
  timeZone: string,
) {
  try {
    return dayjs(instant.epochMilliseconds).tz(timeZone).format();
  } catch {
    return 'Invalid Date';
  }
}

export type DstInfo = {
  /** The zone changes to daylight saving time in the selected year. */
  observesDst: boolean;
  /** The selected instant falls in daylight saving time. */
  isDst: boolean;
  standardOffset: string;
  daylightOffset: string | null;
};

const yearOffsetsCache = new Map<
  string,
  {
    min: number;
    max: number;
    observes: boolean;
    minOffset: string;
    maxOffset: string;
  }
>();

function yearOffsets(timeZone: string, year: number) {
  const key = `${timeZone}|${year}`;
  const cached = yearOffsetsCache.get(key);
  if (cached) return cached;
  const start = Temporal.ZonedDateTime.from({year, month: 1, day: 1, timeZone});
  const end = start.add({years: 1});
  let cursor: Temporal.ZonedDateTime | null = start;
  const samples: Temporal.ZonedDateTime[] = [start];
  let transitions = 0;
  while (cursor && transitions < 8) {
    cursor = cursor.getTimeZoneTransition('next');
    if (!cursor || Temporal.ZonedDateTime.compare(cursor, end) >= 0) break;
    samples.push(cursor);
    transitions++;
  }
  let minSample = samples[0]!;
  let maxSample = samples[0]!;
  for (const sample of samples) {
    if (sample.offsetNanoseconds < minSample.offsetNanoseconds)
      minSample = sample;
    if (sample.offsetNanoseconds > maxSample.offsetNanoseconds)
      maxSample = sample;
  }
  const result = {
    min: minSample.offsetNanoseconds,
    max: maxSample.offsetNanoseconds,
    observes:
      transitions >= 2 &&
      minSample.offsetNanoseconds !== maxSample.offsetNanoseconds,
    minOffset: minSample.offset,
    maxOffset: maxSample.offset,
  };
  yearOffsetsCache.set(key, result);
  return result;
}

/**
 * DST facts for the selected date, from the zone's own rules for that year
 * (never a fixed per-city offset). Standard time is the year's lowest offset.
 */
export function dstInfo(zdt: Temporal.ZonedDateTime): DstInfo {
  const offsets = yearOffsets(zdt.timeZoneId, zdt.year);
  return {
    observesDst: offsets.observes,
    isDst: offsets.observes && zdt.offsetNanoseconds > offsets.min,
    standardOffset: offsets.minOffset,
    daylightOffset: offsets.observes ? offsets.maxOffset : null,
  };
}

export function hemisphere(timeZone: string): string {
  try {
    const value = spacetime.now(timeZone).hemisphere();
    return value ? value : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/** Short zone name from Intl for that instant, e.g. `EDT` or `GMT+9`. */
export function shortZoneName(zdt: Temporal.ZonedDateTime): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zdt.timeZoneId,
      timeZoneName: 'short',
    }).formatToParts(instantToDate(zdt.toInstant()));
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

export function friendlyDate(zdt: Temporal.ZonedDateTime): string {
  return zdt.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function longDate(zdt: Temporal.ZonedDateTime): string {
  return zdt.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Rough daytime indicator by local hour (06:00–17:59); not astronomical. */
export function isApproxDaytime(zdt: Temporal.ZonedDateTime): boolean {
  return zdt.hour >= 6 && zdt.hour < 18;
}

export function nowInstant(): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(Date.now());
}

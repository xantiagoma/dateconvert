import {format as tiempoFormat} from '@gobrand/tiempo';
import {
  Temporal,
  formatPattern,
  resolveWallTime,
  type ParseResult,
} from './time';

/**
 * Custom formats in two token syntaxes, both editable in both directions:
 * - `dayjs`: Day.js tokens (the original DateConvert syntax, English).
 * - `datefns`: date-fns tokens rendered by @gobrand/tiempo on Temporal, in any
 *   locale Intl supports.
 *
 * Reading text back (`parseCustom`) follows one policy for both:
 * - fields missing from the pattern (e.g. the date in `HH:mm`) come from the
 *   current instant in that zone;
 * - without an offset or epoch token, the text is a wall time in the zone: DST
 *   gaps are rejected, repeated times pick the occurrence that round-trips;
 * - the result must format back to exactly the typed text, so inconsistent
 *   weekdays, zone names or 12-hour times without AM/PM are rejected.
 */
export type Syntax = 'dayjs' | 'datefns';

export function formatCustom(
  instant: Temporal.Instant,
  timeZone: string,
  pattern: string,
  syntax: Syntax,
  locale: string,
  offsetMinutes?: number,
): string {
  if (syntax === 'dayjs') {
    return formatPattern(instant, timeZone, pattern, offsetMinutes);
  }
  try {
    const zone =
      offsetMinutes === undefined ? timeZone : offsetString(offsetMinutes);
    return tiempoFormat(instant.toZonedDateTimeISO(zone), pattern, {locale});
  } catch (error) {
    return error instanceof Error ? `⚠ ${error.message}` : '⚠ Invalid pattern';
  }
}

function offsetString(minutes: number) {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

type Field =
  | 'year'
  | 'year2'
  | 'month'
  | 'monthName'
  | 'day'
  | 'hour'
  | 'hour12'
  | 'hour24k'
  | 'minute'
  | 'second'
  | 'fraction'
  | 'meridiem'
  | 'offset'
  | 'epochS'
  | 'epochMs';

type Spec = [regex: string, field: Field | null];

const NUM = (digits: string) => `(\\d{${digits}})`;
const WORD = '[\\p{L}\\p{M}.]+';
const ORDINAL = '(\\d{1,2})(?:st|nd|rd|th)';
const MERIDIEM = '(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?)';
const ZONE_NAME = '[\\p{L}0-9+\\-:]+?';
const LONG_ZONE_NAME = '[\\p{L}][\\p{L} .\\-]*?';

export const DAYJS_TOKENS: Record<string, Spec> = {
  YYYY: ['([+-]?\\d{4,6})', 'year'],
  YY: [NUM('2'), 'year2'],
  MMMM: [`(${WORD})`, 'monthName'],
  MMM: [`(${WORD})`, 'monthName'],
  MM: [NUM('2'), 'month'],
  M: [NUM('1,2'), 'month'],
  Do: [ORDINAL, 'day'],
  DD: [NUM('2'), 'day'],
  D: [NUM('1,2'), 'day'],
  dddd: [WORD, null],
  ddd: [WORD, null],
  dd: [WORD, null],
  d: ['\\d', null],
  HH: [NUM('2'), 'hour'],
  H: [NUM('1,2'), 'hour'],
  hh: [NUM('2'), 'hour12'],
  h: [NUM('1,2'), 'hour12'],
  kk: [NUM('2'), 'hour24k'],
  k: [NUM('1,2'), 'hour24k'],
  mm: [NUM('2'), 'minute'],
  m: [NUM('1,2'), 'minute'],
  ss: [NUM('2'), 'second'],
  s: [NUM('1,2'), 'second'],
  SSS: [NUM('3'), 'fraction'],
  SS: [NUM('2'), 'fraction'],
  S: [NUM('1'), 'fraction'],
  A: [MERIDIEM, 'meridiem'],
  a: [MERIDIEM, 'meridiem'],
  ZZ: ['([+-]\\d{4})', 'offset'],
  Z: ['([+-]\\d{2}:\\d{2})', 'offset'],
  zzz: [LONG_ZONE_NAME, null],
  z: [ZONE_NAME, null],
  X: ['(-?\\d+)', 'epochS'],
  x: ['(-?\\d+)', 'epochMs'],
  Q: ['[1-4]', null],
  wo: ['\\d{1,2}(?:st|nd|rd|th)', null],
  ww: ['\\d{2}', null],
  w: ['\\d{1,2}', null],
};

const OFFSET = '(Z|[+-]\\d{2}(?::?\\d{2})?)';

export const DATEFNS_TOKENS: Record<string, Spec> = {
  yyyy: ['([+-]?\\d{4,6})', 'year'],
  yyy: ['(\\d{3,6})', 'year'],
  yy: [NUM('2'), 'year2'],
  y: ['([+-]?\\d{1,6})', 'year'],
  MMMMM: [WORD, null],
  MMMM: [`(${WORD})`, 'monthName'],
  MMM: [`(${WORD})`, 'monthName'],
  MM: [NUM('2'), 'month'],
  Mo: ['(\\d{1,2})(?:st|nd|rd|th)', 'month'],
  M: [NUM('1,2'), 'month'],
  do: [ORDINAL, 'day'],
  dd: [NUM('2'), 'day'],
  d: [NUM('1,2'), 'day'],
  EEEEE: [WORD, null],
  EEEE: [WORD, null],
  EEE: [WORD, null],
  EE: [WORD, null],
  E: [WORD, null],
  HH: [NUM('2'), 'hour'],
  H: [NUM('1,2'), 'hour'],
  hh: [NUM('2'), 'hour12'],
  h: [NUM('1,2'), 'hour12'],
  mm: [NUM('2'), 'minute'],
  m: [NUM('1,2'), 'minute'],
  ss: [NUM('2'), 'second'],
  s: [NUM('1,2'), 'second'],
  SSS: [NUM('3'), 'fraction'],
  SS: [NUM('2'), 'fraction'],
  S: [NUM('1'), 'fraction'],
  aaaaa: ['[ap]', null],
  aaaa: [MERIDIEM, 'meridiem'],
  aaa: [MERIDIEM, 'meridiem'],
  aa: [MERIDIEM, 'meridiem'],
  a: [MERIDIEM, 'meridiem'],
  XXXXX: [OFFSET, 'offset'],
  XXXX: [OFFSET, 'offset'],
  XXX: [OFFSET, 'offset'],
  XX: [OFFSET, 'offset'],
  X: [OFFSET, 'offset'],
  xxxxx: [OFFSET, 'offset'],
  xxxx: [OFFSET, 'offset'],
  xxx: [OFFSET, 'offset'],
  xx: [OFFSET, 'offset'],
  x: [OFFSET, 'offset'],
  zzzz: [LONG_ZONE_NAME, null],
  zzz: [ZONE_NAME, null],
  zz: [ZONE_NAME, null],
  z: [ZONE_NAME, null],
  GGGGG: [WORD, null],
  GGGG: ['[\\p{L} .]+?', null],
  GGG: [WORD, null],
  GG: [WORD, null],
  G: [WORD, null],
  QQQQ: ['[\\p{L}0-9 ]+?', null],
  QQQ: ['[\\p{L}0-9]+', null],
  QQ: ['\\d{2}', null],
  Q: ['[1-4]', null],
  T: ['(-?\\d+)', 'epochMs'],
  t: ['(-?\\d+)', 'epochS'],
};

/** Day.js `en` localized formats, expanded before tokenizing. */
const DAYJS_LOCALIZED: Record<string, string> = {
  LTS: 'h:mm:ss A',
  LT: 'h:mm A',
  LLLL: 'dddd, MMMM D, YYYY h:mm A',
  LLL: 'MMMM D, YYYY h:mm A',
  LL: 'MMMM D, YYYY',
  L: 'MM/DD/YYYY',
  llll: 'ddd, MMM D, YYYY h:mm A',
  lll: 'MMM D, YYYY h:mm A',
  ll: 'MMM D, YYYY',
  l: 'M/D/YYYY',
};

const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tokenRegex = (tokens: Record<string, Spec>, literal: string) =>
  new RegExp(
    `${literal}|${Object.keys(tokens)
      .sort((a, b) => b.length - a.length)
      .join('|')}|.`,
    'gsu',
  );

const DAYJS_TOKEN = tokenRegex(
  {
    ...DAYJS_TOKENS,
    ...Object.fromEntries(
      Object.keys(DAYJS_LOCALIZED).map((k) => [k, ['', null]]),
    ),
  },
  '\\[[^\\]]*\\]',
);
const DATEFNS_TOKEN = tokenRegex(DATEFNS_TOKENS, "'(?:[^']|'')*'");

export type PatternPart =
  | {kind: 'token'; text: string; start: number; end: number}
  | {kind: 'literal'; text: string; start: number; end: number};

/** Split a pattern into tokens and literals (for highlighting and editing). */
export function tokenize(pattern: string, syntax: Syntax): PatternPart[] {
  const tokens = syntax === 'dayjs' ? DAYJS_TOKENS : DATEFNS_TOKENS;
  const matcher = new RegExp(
    (syntax === 'dayjs' ? DAYJS_TOKEN : DATEFNS_TOKEN).source,
    'gsu',
  );
  const parts: PatternPart[] = [];
  for (const match of pattern.matchAll(matcher)) {
    const text = match[0];
    const start = match.index!;
    const isToken =
      text in tokens || (syntax === 'dayjs' && text in DAYJS_LOCALIZED);
    const last = parts[parts.length - 1];
    if (
      !isToken &&
      last?.kind === 'literal' &&
      text.length === 1 &&
      !/^[[']/.test(last.text)
    ) {
      last.text += text;
      last.end = start + text.length;
    } else {
      parts.push({
        kind: isToken ? 'token' : 'literal',
        text,
        start,
        end: start + text.length,
      });
    }
  }
  return parts;
}

function compile(pattern: string, syntax: Syntax) {
  const tokens = syntax === 'dayjs' ? DAYJS_TOKENS : DATEFNS_TOKENS;
  let expanded = pattern;
  if (syntax === 'dayjs') {
    expanded = pattern.replace(
      /\[[^\]]*]|LTS|LT|LLLL|LLL|LL|L|llll|lll|ll|l/g,
      (match) =>
        match.startsWith('[') ? match : (DAYJS_LOCALIZED[match] ?? match),
    );
  }
  const fields: Field[] = [];
  let source = '';
  const matcher = new RegExp(
    (syntax === 'dayjs' ? DAYJS_TOKEN : DATEFNS_TOKEN).source,
    'gsu',
  );
  for (const [token] of expanded.matchAll(matcher)) {
    if (syntax === 'dayjs' && token.startsWith('[') && token.endsWith(']')) {
      source += escapeRegex(token.slice(1, -1));
      continue;
    }
    if (syntax === 'datefns' && token.startsWith("'") && token.length > 1) {
      source += escapeRegex(token.slice(1, -1).replace(/''/g, "'") || "'");
      continue;
    }
    const spec = tokens[token];
    if (!spec) {
      source += token === ' ' ? '\\s' : escapeRegex(token);
      continue;
    }
    source += spec[0];
    if (spec[1]) fields.push(spec[1]);
  }
  return {regex: new RegExp(`^${source}$`, 'iu'), fields};
}

const monthNameCache = new Map<string, string[][]>();

/** Long and short month names for the locale (Gregorian), lower-cased. */
function monthNames(locale: string): string[][] {
  let names = monthNameCache.get(locale);
  if (!names) {
    const forms = (['long', 'short'] as const).map((month) => {
      const intl = new Intl.DateTimeFormat(locale, {
        month,
        timeZone: 'UTC',
        calendar: 'gregory',
      });
      return Array.from({length: 12}, (_, i) =>
        intl
          .format(Date.UTC(2026, i, 15))
          .toLowerCase()
          .replace(/\.$/, ''),
      );
    });
    names = Array.from({length: 12}, (_, i) => forms.map((form) => form[i]!));
    monthNameCache.set(locale, names);
  }
  return names;
}

export function parseCustom(
  text: string,
  pattern: string,
  timeZone: string,
  reference: Temporal.Instant,
  syntax: Syntax = 'dayjs',
  locale = 'en-US',
): ParseResult {
  const value = text.trim();
  if (!value)
    return {ok: false, message: 'Enter a value written in the pattern above.'};
  if (!pattern.trim()) return {ok: false, message: 'The pattern is empty.'};

  const nameLocale = syntax === 'dayjs' ? 'en-US' : locale;
  const format = (instant: Temporal.Instant, offset?: number) =>
    formatCustom(instant, timeZone, pattern, syntax, nameLocale, offset);
  const sameText = (a: string) =>
    a.replace(/\s/g, ' ') === value.replace(/\s/g, ' ');

  const {regex, fields} = compile(pattern, syntax);
  const match = regex.exec(value);
  if (!match) {
    return {
      ok: false,
      message: `Doesn't match the pattern. Expected something like “${format(reference)}”.`,
    };
  }

  const got: Partial<Record<Field, string>> = {};
  fields.forEach((field, index) => {
    got[field] = match[index + 1];
  });

  const candidates: Temporal.Instant[] = [];
  let offsetMinutes: number | undefined;
  try {
    if (got.epochMs !== undefined) {
      candidates.push(
        Temporal.Instant.fromEpochMilliseconds(Number(got.epochMs)),
      );
    } else if (got.epochS !== undefined) {
      candidates.push(
        Temporal.Instant.fromEpochMilliseconds(Number(got.epochS) * 1000),
      );
    } else {
      const now = reference.toZonedDateTimeISO(timeZone);
      if (got.hour12 !== undefined && got.meridiem === undefined) {
        return {
          ok: false,
          message: 'A 12-hour pattern needs an AM/PM token to tell them apart.',
        };
      }
      let monthIndex: number | undefined;
      if (got.monthName !== undefined) {
        const name = got.monthName.toLowerCase().replace(/\.$/, '');
        monthIndex = monthNames(nameLocale).findIndex((forms) =>
          forms.includes(name),
        );
        if (monthIndex < 0)
          return {ok: false, message: `Unknown month “${got.monthName}”.`};
      }
      let hour = now.hour;
      if (got.hour !== undefined) hour = Number(got.hour);
      else if (got.hour24k !== undefined) hour = Number(got.hour24k) % 24;
      else if (got.hour12 !== undefined) {
        const h = Number(got.hour12);
        if (h < 1 || h > 12)
          return {ok: false, message: 'Hours in 12-hour time go from 1 to 12.'};
        hour =
          (h % 12) + (got.meridiem!.toLowerCase().startsWith('p') ? 12 : 0);
      }
      const year =
        got.year !== undefined
          ? Number(got.year)
          : got.year2 !== undefined
            ? 2000 + Number(got.year2) - (Number(got.year2) > 68 ? 100 : 0)
            : now.year;
      const fraction = got.fraction;
      let pdt: Temporal.PlainDateTime;
      try {
        pdt = Temporal.PlainDateTime.from(
          {
            year,
            month:
              got.month !== undefined
                ? Number(got.month)
                : monthIndex !== undefined
                  ? monthIndex + 1
                  : now.month,
            day: got.day !== undefined ? Number(got.day) : now.day,
            hour,
            minute: got.minute !== undefined ? Number(got.minute) : now.minute,
            second: got.second !== undefined ? Number(got.second) : now.second,
            millisecond:
              fraction !== undefined
                ? Number(fraction.padEnd(3, '0'))
                : now.millisecond,
          },
          {overflow: 'reject'},
        );
      } catch {
        return {ok: false, message: 'That date or time does not exist.'};
      }
      if (got.offset !== undefined) {
        const raw = got.offset.toUpperCase() === 'Z' ? '+00:00' : got.offset;
        const digits = raw.replace(/[^\d]/g, '').padEnd(4, '0');
        const sign = raw.startsWith('-') ? -1 : 1;
        offsetMinutes =
          sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4)));
        candidates.push(
          Temporal.Instant.from(
            `${pdt.toString()}${offsetString(offsetMinutes)}`,
          ),
        );
      } else {
        const resolution = resolveWallTime(pdt, timeZone);
        if (resolution.kind === 'gap') {
          return {
            ok: false,
            message: `${pdt.toPlainTime().toString({smallestUnit: 'minute'})} does not exist in ${timeZone} on ${pdt.toPlainDate()} (the clocks jump forward).`,
            gap: {before: resolution.before, after: resolution.after},
          };
        }
        if (resolution.kind === 'fold') {
          candidates.push(
            resolution.earlier.toInstant(),
            resolution.later.toInstant(),
          );
        } else {
          candidates.push(resolution.zdt.toInstant());
        }
      }
    }
  } catch {
    return {
      ok: false,
      message: 'Out of supported range (about ±275,760 years from 1970).',
    };
  }

  for (const instant of candidates) {
    // Prefer the zone's own rules (zone names, DST); an explicit offset that
    // differs from the zone still round-trips at that fixed offset.
    if (sameText(format(instant))) return {ok: true, instant};
    if (
      offsetMinutes !== undefined &&
      sameText(format(instant, offsetMinutes))
    ) {
      return {ok: true, instant};
    }
  }
  return {
    ok: false,
    message: `Read as “${format(candidates[0]!, offsetMinutes)}”, which differs from what you typed. Check the weekday, zone name or AM/PM.`,
  };
}

import {expect, test} from 'bun:test';
import {
  DEFAULT_INTL,
  canonicalLocale,
  formatIntl,
  intlSnippet,
  relativeTime,
} from './intl';
import {Temporal} from './time';

const AT = Temporal.Instant.from('2026-10-26T14:30:00Z');
const es = {...DEFAULT_INTL, locale: 'es-CO'};

test('styles, translation and zone', () => {
  expect(formatIntl(AT, es, 'America/Bogota', {dateStyle: 'full'})).toBe(
    'lunes, 26 de octubre de 2026',
  );
  expect(
    formatIntl(AT, {...DEFAULT_INTL, locale: 'en-US'}, 'Asia/Tokyo', {
      timeStyle: 'short',
    }),
  ).toBe('11:30 PM');
});

test('calendar, numbering system and hour cycle', () => {
  const ja = {...DEFAULT_INTL, locale: 'ja-JP', calendar: 'japanese'};
  expect(
    formatIntl(AT, ja, 'Asia/Tokyo', {year: 'numeric', era: 'long'}),
  ).toContain('令和');
  const arab = {...DEFAULT_INTL, locale: 'en-US', numberingSystem: 'arab'};
  expect(formatIntl(AT, arab, 'UTC', {day: 'numeric'})).toBe('٢٦');
  const h23 = {...DEFAULT_INTL, locale: 'en-US', hourCycle: 'h23'};
  expect(
    formatIntl(AT, h23, 'America/New_York', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  ).toBe('10:30');
});

test('invalid locales are detected', () => {
  expect(canonicalLocale('es-co')).toBe('es-CO');
  expect(canonicalLocale('not a locale')).toBeNull();
});

test('snippet mirrors the options', () => {
  expect(intlSnippet(es, 'America/Bogota', {dateStyle: 'long'})).toBe(
    "new Intl.DateTimeFormat('es-CO', {timeZone: 'America/Bogota', dateStyle: 'long'}).format(date)",
  );
});

test('relative time picks the largest unit', () => {
  const now = Temporal.Instant.from('2026-10-23T14:30:00Z');
  expect(relativeTime(AT, now, 'en-US')).toBe('in 3 days');
  expect(relativeTime(now, AT, 'es-CO')).toBe('hace 3 días');
  expect(relativeTime(AT, AT, 'en-US')).toBe('now');
});

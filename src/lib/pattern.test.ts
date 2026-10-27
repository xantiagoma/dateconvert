import {describe, expect, test} from 'bun:test';
import {formatCustom, parseCustom} from './pattern';
import {DEFAULT_PATTERN, Temporal, formatIsoUtc, formatPattern} from './time';

const REF = Temporal.Instant.from('2026-10-26T14:30:00.123Z');
const iso = (text: string, pattern: string, zone: string, ref = REF) => {
  const result = parseCustom(text, pattern, zone, ref);
  return result.ok ? formatIsoUtc(result.instant) : `ERR ${result.message}`;
};

describe('custom pattern input', () => {
  test.each([
    ['America/Bogota'],
    ['America/New_York'],
    ['Asia/Kathmandu'],
    ['Europe/London'],
  ])('original pattern round-trips in %s', (zone) => {
    const text = formatPattern(REF, zone, DEFAULT_PATTERN);
    expect(iso(text, DEFAULT_PATTERN, zone)).toBe('2026-10-26T14:30:00.123Z');
  });

  test.each([
    'YYYY-MM-DD HH:mm:ss.SSS',
    'YYYY-MM-DD HH:mm:ss.SSS Z',
    'YYYY-MM-DD HH:mm:ss.SSS ZZ',
    'DD.MM.YYYY HH:mm:ss.SSS',
    'MMM D, YYYY h:mm:ss.SSS a',
    '[Day] D [of] MMMM YYYY, HH:mm:ss.SSS (zzz)',
    'x',
  ])('round-trips %p', (pattern) => {
    const text = formatPattern(REF, 'America/New_York', pattern);
    expect(iso(text, pattern, 'America/New_York')).toBe(
      '2026-10-26T14:30:00.123Z',
    );
  });

  test('missing fields come from the current instant', () => {
    expect(iso('10:30', 'HH:mm', 'Asia/Tokyo')).toBe(
      '2026-10-26T01:30:00.123Z',
    );
    expect(iso('2026-12-25', 'YYYY-MM-DD', 'UTC')).toBe(
      '2026-12-25T14:30:00.123Z',
    );
  });

  test('explicit offset wins over the zone', () => {
    expect(
      iso('2026-10-26 09:30 -05:00', 'YYYY-MM-DD HH:mm Z', 'Asia/Tokyo'),
    ).toBe('2026-10-26T14:30:00.123Z');
  });

  test('wrong weekday is rejected', () => {
    expect(iso('Tuesday 2026-10-26', 'dddd YYYY-MM-DD', 'UTC')).toMatch(
      /^ERR Read as/,
    );
  });

  test('12-hour time needs a meridiem', () => {
    expect(iso('03:00', 'hh:mm', 'UTC')).toMatch(/AM\/PM token/);
  });

  test('non-matching text explains the expected shape', () => {
    expect(iso('2026/10/26', 'YYYY-MM-DD', 'UTC')).toMatch(
      /Expected something like “2026-10-26”/,
    );
  });

  test('invalid dates are rejected, not rolled over', () => {
    expect(iso('2026-02-30', 'YYYY-MM-DD', 'UTC')).toMatch(/does not exist/);
  });

  test('DST: gap rejected, fold disambiguated by zone name', () => {
    const ref = Temporal.Instant.from('2026-11-01T12:00:00Z');
    expect(
      iso('2026-03-08 02:30', 'YYYY-MM-DD HH:mm', 'America/New_York', ref),
    ).toMatch(/does not exist/);
    expect(
      iso(
        '2026-11-01 01:30 EDT',
        'YYYY-MM-DD HH:mm z',
        'America/New_York',
        ref,
      ),
    ).toBe('2026-11-01T05:30:00.000Z');
    expect(
      iso(
        '2026-11-01 01:30 EST',
        'YYYY-MM-DD HH:mm z',
        'America/New_York',
        ref,
      ),
    ).toBe('2026-11-01T06:30:00.000Z');
  });
});

describe('date-fns syntax via tiempo (Temporal)', () => {
  const fns = (
    text: string,
    pattern: string,
    zone: string,
    locale = 'en-US',
  ) => {
    const result = parseCustom(text, pattern, zone, REF, 'datefns', locale);
    return result.ok ? formatIsoUtc(result.instant) : `ERR ${result.message}`;
  };

  test('formats with locale translations', () => {
    expect(
      formatCustom(
        REF,
        'America/Bogota',
        "EEEE, d 'de' MMMM 'de' yyyy",
        'datefns',
        'es-CO',
      ),
    ).toBe('lunes, 26 de octubre de 2026');
    expect(
      formatCustom(
        REF,
        'Asia/Tokyo',
        'yyyy-MM-dd HH:mm:ss.SSS',
        'datefns',
        'en-US',
      ),
    ).toBe('2026-10-26 23:30:00.123');
  });

  test.each([
    ['yyyy-MM-dd HH:mm:ss.SSS', 'en-US'],
    ["EEEE, MMMM do, yyyy 'at' h:mm:ss.SSS a", 'en-US'],
    ["EEEE d 'de' MMMM 'de' yyyy, HH:mm:ss.SSS", 'es-CO'],
    ['dd/MM/yyyy HH:mm:ss.SSS XXX', 'fr-FR'],
    ['T', 'en-US'],
  ])('round-trips %p in %s', (pattern, locale) => {
    const text = formatCustom(
      REF,
      'America/New_York',
      pattern,
      'datefns',
      locale,
    );
    expect(fns(text, pattern, 'America/New_York', locale)).toBe(
      '2026-10-26T14:30:00.123Z',
    );
  });

  test('unknown localized month is reported', () => {
    expect(fns('26 brumaire 2026', 'd MMMM yyyy', 'UTC', 'es-CO')).toMatch(
      /Unknown month/,
    );
  });
});

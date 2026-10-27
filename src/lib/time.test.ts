import {describe, expect, test} from 'bun:test';
import {
  DEFAULT_PATTERN,
  Temporal,
  dstInfo,
  epochMilliseconds,
  epochSeconds,
  foldAlternatives,
  formatDayjsDefault,
  formatIsoUtc,
  formatLocalIso,
  formatOffsetDateTime,
  formatPattern,
  formatPlainTime,
  formatRfc9557,
  formatUtcString,
  friendlyDate,
  localeUses12Hour,
  uses12Hour,
  hemisphere,
  longDate,
  shortZoneName,
  parseIsoInstant,
  parsePlainDate,
  parsePlainTime,
  parseUnixMilliseconds,
  parseUnixSeconds,
  parseWallTime,
  parseZonedDateTime,
  type ParseResult,
} from './time';
import fixtures from './fixtures.json';

const FIXTURE = Temporal.Instant.from(fixtures.isoUTC);

function instantOf(result: ParseResult) {
  if (!result.ok) throw new Error(`Expected ok, got: ${result.message}`);
  return result.instant;
}

function wall(date: string, time: string, zone: string) {
  const d = parsePlainDate(date);
  const t = parsePlainTime(time);
  if (typeof d === 'string' || typeof t === 'string')
    throw new Error('bad input');
  return parseWallTime(d, t, zone);
}

describe('fixture through every editor', () => {
  test('representations of the fixture', () => {
    expect(formatIsoUtc(FIXTURE)).toBe('2026-10-26T14:30:00.000Z');
    expect(epochSeconds(FIXTURE)).toBe(String(fixtures.epochSeconds));
    expect(epochMilliseconds(FIXTURE)).toBe(String(fixtures.epochMilliseconds));
  });

  test.each([
    ['seconds', parseUnixSeconds('1793025000')],
    ['milliseconds', parseUnixMilliseconds('1793025000000')],
    ['ISO with Z', parseIsoInstant('2026-10-26T14:30:00.000Z')],
    ['ISO with offset', parseIsoInstant('2026-10-26T09:30:00-05:00')],
    ['date with offset', parseZonedDateTime('2026-10-26T09:30:00-05:00')],
    [
      'RFC 9557',
      parseZonedDateTime('2026-10-26T09:30:00-05:00[America/Bogota]'),
    ],
    ['wall time Bogotá', wall('2026-10-26', '09:30:00', 'America/Bogota')],
    ['wall time Tokyo', wall('2026-10-26', '23:30', 'Asia/Tokyo')],
  ])('%s', (_, result) => {
    expect(instantOf(result).equals(FIXTURE)).toBe(true);
  });

  test.each(Object.entries(fixtures.zones))('%s', (zone, expected) => {
    const zdt = FIXTURE.toZonedDateTimeISO(zone);
    expect(formatOffsetDateTime(zdt)).toBe(expected);
  });

  test('Kathmandu fractional offset', () => {
    const zdt = FIXTURE.toZonedDateTimeISO('Asia/Kathmandu');
    expect(formatPlainTime(zdt)).toBe('20:15:00');
    expect(zdt.offset).toBe('+05:45');
  });
});

describe('timestamps', () => {
  test('zero and negatives', () => {
    expect(formatIsoUtc(instantOf(parseUnixSeconds('0')))).toBe(
      '1970-01-01T00:00:00.000Z',
    );
    expect(formatIsoUtc(instantOf(parseUnixSeconds('-1')))).toBe(
      '1969-12-31T23:59:59.000Z',
    );
    expect(formatIsoUtc(instantOf(parseUnixMilliseconds('-1')))).toBe(
      '1969-12-31T23:59:59.999Z',
    );
  });

  test('milliseconds survive zone changes and rendering', () => {
    const instant = instantOf(parseUnixMilliseconds('1793025000123'));
    expect(formatIsoUtc(instant)).toBe('2026-10-26T14:30:00.123Z');
    const tokyo = instant.toZonedDateTimeISO('Asia/Tokyo');
    expect(formatLocalIso(tokyo)).toBe('2026-10-26T23:30:00.123+09:00');
    expect(tokyo.toInstant().epochMilliseconds).toBe(1793025000123);
    expect(epochSeconds(instant)).toBe('1793025000');
  });

  test('decimal seconds round-trip to milliseconds', () => {
    const instant = instantOf(parseUnixSeconds('1793025000.123'));
    expect(epochMilliseconds(instant)).toBe('1793025000123');
    expect(epochSeconds(instantOf(parseUnixSeconds('-0.5')))).toBe('-1');
  });

  test.each([
    '',
    ' ',
    '-',
    '+',
    'abc',
    '1e9',
    'NaN',
    'Infinity',
    '12.3456',
    '1,000',
  ])('seconds rejects %p', (text) =>
    expect(parseUnixSeconds(text).ok).toBe(false),
  );

  test.each(['', '-', '1.5', 'Infinity', '1e12'])(
    'milliseconds rejects %p',
    (text) => {
      expect(parseUnixMilliseconds(text).ok).toBe(false);
    },
  );

  test('out of range is rejected', () => {
    expect(parseUnixMilliseconds('8640000000000001').ok).toBe(false);
    expect(parseUnixMilliseconds('8640000000000000').ok).toBe(true);
    expect(parseUnixSeconds('99999999999999999').ok).toBe(false);
  });
});

describe('ISO and offsets', () => {
  test('ISO without offset is refused, not guessed', () => {
    const result = parseIsoInstant('2026-10-26T14:30:00');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/offset/);
  });

  test.each(['2026-', '2026-10-26T', '2026-13-01T00:00Z', 'tomorrow'])(
    'partial or invalid ISO %p',
    (text) => expect(parseIsoInstant(text).ok).toBe(false),
  );

  test('day boundary', () => {
    const instant = instantOf(parseIsoInstant('2026-10-26T23:30:00Z'));
    expect(formatOffsetDateTime(instant.toZonedDateTimeISO('Asia/Tokyo'))).toBe(
      '2026-10-27T08:30:00+09:00',
    );
  });

  test('RFC 9557 with a mismatched offset is rejected', () => {
    expect(
      parseZonedDateTime('2026-10-26T09:30:00-04:00[America/Bogota]').ok,
    ).toBe(false);
    expect(parseZonedDateTime('2026-10-26T09:30:00[Nowhere/City]').ok).toBe(
      false,
    );
  });

  test('RFC 9557 output', () => {
    expect(formatRfc9557(FIXTURE.toZonedDateTimeISO('America/Bogota'))).toBe(
      '2026-10-26T09:30:00-05:00[America/Bogota]',
    );
  });
});

describe('wall time', () => {
  test.each([
    ['2026-02-30', 'Use'],
    ['2026-2-3', 'Use'],
  ])('invalid date %p', (text) => {
    expect(typeof parsePlainDate(text)).toBe('string');
  });

  test.each(['24:00', '9:60', '09:30:60', '09', '09:30:00.1234'])(
    'invalid time %p',
    (text) => {
      expect(typeof parsePlainTime(text)).toBe('string');
    },
  );

  test('time with milliseconds', () => {
    const instant = instantOf(
      wall('2026-10-26', '09:30:00.123', 'America/Bogota'),
    );
    expect(formatIsoUtc(instant)).toBe('2026-10-26T14:30:00.123Z');
  });
});

describe('DST', () => {
  test('spring-forward gap is an explicit error with both options', () => {
    const result = wall('2026-03-08', '02:30', 'America/New_York');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.gap).toBeDefined();
    expect(formatOffsetDateTime(result.gap!.before)).toBe(
      '2026-03-08T01:30:00-05:00',
    );
    expect(formatOffsetDateTime(result.gap!.after)).toBe(
      '2026-03-08T03:30:00-04:00',
    );
  });

  test('fall-back fold resolves to the earlier occurrence and exposes both', () => {
    const instant = instantOf(wall('2026-11-01', '01:30', 'America/New_York'));
    expect(formatIsoUtc(instant)).toBe('2026-11-01T05:30:00.000Z');
    const fold = foldAlternatives(
      instant.toZonedDateTimeISO('America/New_York'),
    );
    expect(fold).not.toBeNull();
    expect(fold!.earlier.offset).toBe('-04:00');
    expect(fold!.later.offset).toBe('-05:00');
    expect(formatIsoUtc(fold!.later.toInstant())).toBe(
      '2026-11-01T06:30:00.000Z',
    );
  });

  test('explicit offsets inside the fold are distinct instants', () => {
    expect(
      formatIsoUtc(instantOf(parseIsoInstant('2026-11-01T01:30:00-04:00'))),
    ).toBe('2026-11-01T05:30:00.000Z');
    expect(
      formatIsoUtc(instantOf(parseIsoInstant('2026-11-01T01:30:00-05:00'))),
    ).toBe('2026-11-01T06:30:00.000Z');
  });

  test('observes DST vs DST at the selected date', () => {
    const at = (zone: string) => dstInfo(FIXTURE.toZonedDateTimeISO(zone));
    expect(at('America/New_York')).toMatchObject({
      observesDst: true,
      isDst: true,
    });
    expect(at('Europe/London')).toMatchObject({
      observesDst: true,
      isDst: false,
    });
    expect(at('America/Bogota')).toMatchObject({
      observesDst: false,
      isDst: false,
    });
    expect(at('Asia/Tokyo')).toMatchObject({observesDst: false, isDst: false});
    expect(at('Europe/London').daylightOffset).toBe('+01:00');
  });

  test('southern hemisphere DST', () => {
    const sydney = FIXTURE.toZonedDateTimeISO('Australia/Sydney');
    expect(dstInfo(sydney)).toMatchObject({
      observesDst: true,
      isDst: true,
      standardOffset: '+10:00',
    });
    expect(hemisphere('Australia/Sydney')).toBe('South');
    expect(hemisphere('America/Bogota')).toBe('North');
  });

  test('metadata follows the selected date, not today', () => {
    const july = Temporal.Instant.from(
      '2026-07-01T12:00:00Z',
    ).toZonedDateTimeISO('Europe/London');
    expect(dstInfo(july).isDst).toBe(true);
    expect(july.offset).toBe('+01:00');
  });
});

describe('formats', () => {
  test('original Day.js pattern with ordinals, ms, z and UTCZ', () => {
    const instant = instantOf(parseUnixMilliseconds('1793025000123'));
    expect(formatPattern(instant, 'America/New_York', DEFAULT_PATTERN)).toBe(
      'Monday October 26th 2026 10:30:00.123 AM (EDT: UTC-04:00)',
    );
  });

  test('simple pattern and escaped literals', () => {
    expect(formatPattern(FIXTURE, 'Asia/Tokyo', 'YYYY-MM-DD HH:mm:ss')).toBe(
      '2026-10-26 23:30:00',
    );
    expect(formatPattern(FIXTURE, 'Asia/Tokyo', '[Day] D [of] MMMM')).toBe(
      'Day 26 of October',
    );
    expect(formatPattern(FIXTURE, 'UTC', 'X x')).toBe(
      '1793025000 1793025000000',
    );
  });

  test('Day.js default and UTC string', () => {
    expect(formatDayjsDefault(FIXTURE, 'America/Bogota')).toBe(
      '2026-10-26T09:30:00-05:00',
    );
    expect(formatUtcString(FIXTURE)).toBe('Mon, 26 Oct 2026 14:30:00 GMT');
  });
});

describe('display helpers', () => {
  test('dates are rendered in the zone of the instant', () => {
    const tokyo = Temporal.Instant.from(
      '2026-10-26T23:30:00Z',
    ).toZonedDateTimeISO('Asia/Tokyo');
    expect(friendlyDate(tokyo)).toBe('Tue, Oct 27, 2026');
    expect(longDate(tokyo)).toBe('Tuesday, October 27, 2026');
    expect(shortZoneName(FIXTURE.toZonedDateTimeISO('America/New_York'))).toBe(
      'EDT',
    );
  });
});

describe('12/24-hour clock', () => {
  test.each([
    ['9:30 pm', '21:30:00'],
    ['9:30PM', '21:30:00'],
    ['12:05 am', '00:05:00'],
    ['12:05 p.m.', '12:05:00'],
    ['9pm', '21:00:00'],
    ['21:30', '21:30:00'],
    ['9:30:15.250 am', '09:30:15.25'],
  ])('parses %p', (text, expected) => {
    const time = parsePlainTime(text);
    expect(typeof time === 'string' ? time : time.toString()).toBe(expected);
  });

  test('formats both ways', () => {
    const zdt = Temporal.Instant.from(
      '2026-10-26T21:05:09.120Z',
    ).toZonedDateTimeISO('UTC');
    expect(formatPlainTime(zdt)).toBe('21:05:09.12');
    expect(formatPlainTime(zdt, true)).toBe('9:05:09.12 PM');
    const midnight = Temporal.Instant.from(
      '2026-10-26T00:00:00Z',
    ).toZonedDateTimeISO('UTC');
    expect(formatPlainTime(midnight, true)).toBe('12:00:00 AM');
  });

  test('locale defaults', () => {
    expect(localeUses12Hour('en-US')).toBe(true);
    expect(localeUses12Hour('es-CO')).toBe(true);
    expect(localeUses12Hour('de-DE')).toBe(false);
    expect(localeUses12Hour('ja-JP')).toBe(false);
    expect(uses12Hour('h23', 'en-US')).toBe(false);
  });
});

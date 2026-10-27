import {expect, test} from 'bun:test';
import {segmentAt, segments, step} from './segments';
import {Temporal} from './time';

test('finds date and time segments', () => {
  expect(segments('2026-10-26', 'date').map((s) => s.kind)).toEqual([
    'year',
    'month',
    'day',
  ]);
  expect(segments('9:30:00.123 PM', 'time').map((s) => s.kind)).toEqual([
    'hour',
    'minute',
    'second',
    'millisecond',
    'meridiem',
  ]);
  expect(segmentAt('2026-10-26', 'date', 6)?.kind).toBe('month');
  expect(segmentAt('09:30:00', 'time', 0)?.kind).toBe('hour');
  expect(segmentAt('09:30:00', 'time', 8)?.kind).toBe('second');
});

test('steps carry across boundaries in the zone', () => {
  const zdt = Temporal.ZonedDateTime.from(
    '2026-10-31T23:59:00-05:00[America/Bogota]',
  );
  expect(step(zdt, 'minute', 1).toPlainDateTime().toString()).toBe(
    '2026-11-01T00:00:00',
  );
  expect(step(zdt, 'month', 1).toPlainDate().toString()).toBe('2026-11-30');
  expect(step(zdt, 'meridiem', -1).hour).toBe(11);
});

import {expect, test} from 'bun:test';
import {DEFAULT_INTL} from './intl';
import {DEFAULT_PATTERN, Temporal, formatIsoUtc} from './time';
import {parseUrlState, serializeUrlState} from './url-state';

const state = {
  instant: Temporal.Instant.from('2026-10-26T14:30:00.123Z'),
  sourceZone: 'America/Bogota',
  zones: ['America/Bogota', 'Asia/Tokyo'],
  pattern: 'YYYY-MM-DD HH:mm',
  showDetails: false,
  intl: {...DEFAULT_INTL, locale: 'es-CO', calendar: 'japanese'},
};

test('round-trips through the query string', () => {
  const search = serializeUrlState(state);
  expect(search).toContain('t=2026-10-26T14:30:00.123Z');
  expect(search).toContain('zones=America/Bogota,Asia/Tokyo');
  const parsed = parseUrlState(search);
  expect(formatIsoUtc(parsed.instant!)).toBe('2026-10-26T14:30:00.123Z');
  expect(parsed).toMatchObject({
    sourceZone: 'America/Bogota',
    zones: ['America/Bogota', 'Asia/Tokyo'],
    pattern: 'YYYY-MM-DD HH:mm',
    showDetails: false,
    intl: {locale: 'es-CO', calendar: 'japanese'},
  });
});

test('defaults are left out of the URL', () => {
  const search = serializeUrlState({
    ...state,
    pattern: DEFAULT_PATTERN,
    showDetails: true,
    intl: DEFAULT_INTL,
  });
  expect(search).not.toContain('fmt=');
  expect(search).not.toContain('details=');
  expect(search).not.toContain('cal=');
});

test('invalid values are ignored', () => {
  const parsed = parseUrlState(
    '?t=tomorrow&tz=Bad/Zone&zones=Asia/Tokyo,Nope&lang=%20&cal=<script>',
  );
  expect(parsed.instant).toBeUndefined();
  expect(parsed.sourceZone).toBeUndefined();
  expect(parsed.zones).toEqual(['Asia/Tokyo']);
  expect(parsed.intl).toBeUndefined();
  expect(formatIsoUtc(parseUrlState('?t=1793025000000').instant!)).toBe(
    '2026-10-26T14:30:00.000Z',
  );
});

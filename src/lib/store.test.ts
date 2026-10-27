import {expect, test} from 'bun:test';
import {
  STORAGE_KEY,
  initialState,
  defaultPreferences,
  loadPreferences,
  reducer,
  type State,
} from './store';
import {Temporal} from './time';

const base = (): State => ({
  instant: Temporal.Instant.from('2026-10-26T14:30:00Z'),
  ...defaultPreferences('America/Bogota'),
  live: false,
});

test('defaults: local zone plus popular zones, deduplicated', () => {
  expect(defaultPreferences('America/Bogota').zones).toEqual([
    'America/Bogota',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
  ]);
  expect(defaultPreferences('Europe/London').zones).toEqual([
    'Europe/London',
    'America/New_York',
    'Asia/Tokyo',
  ]);
});

test('adding or removing zones never touches the instant or source', () => {
  const start = base();
  const added = reducer(start, {type: 'addZone', zone: 'Asia/Kathmandu'});
  const again = reducer(added, {type: 'addZone', zone: 'Asia/Kathmandu'});
  const removed = reducer(again, {type: 'removeZone', zone: 'America/Bogota'});
  expect(again.zones.filter((z) => z === 'Asia/Kathmandu')).toHaveLength(1);
  expect(removed.sourceZone).toBe('America/Bogota');
  expect(removed.instant.equals(start.instant)).toBe(true);
});

test('saved preferences are validated', () => {
  const loaded = loadPreferences(
    JSON.stringify({
      sourceZone: 'Nowhere/City',
      zones: ['Asia/Tokyo', 'Bad/Zone', 'Asia/Tokyo', 42],
      pattern: 'HH:mm',
      showDetails: false,
      intl: {locale: 'not a locale'},
    }),
  );
  expect(loaded.zones).toEqual(['Asia/Tokyo']);
  expect(loaded.sourceZone).not.toBe('Nowhere/City');
  expect(loaded.pattern).toBe('HH:mm');
  expect(loaded.showDetails).toBe(false);
  expect(loaded.intl.locale).not.toBe('not a locale');
  expect(loadPreferences('{broken').zones.length).toBeGreaterThan(0);
});

test('live mode follows ticks until any edit', () => {
  let state = reducer(base(), {type: 'setLive', value: true});
  expect(state.live).toBe(true);
  const tick = Temporal.Instant.from('2030-01-01T00:00:00Z');
  state = reducer(state, {type: 'tick', instant: tick});
  expect(state.instant.equals(tick)).toBe(true);
  const edit = Temporal.Instant.from('2026-10-26T14:30:00Z');
  state = reducer(state, {type: 'setInstant', instant: edit});
  expect(state.live).toBe(false);
  state = reducer(state, {type: 'tick', instant: tick});
  expect(state.instant.equals(edit)).toBe(true);
});

test('switching syntax swaps in that syntax default pattern', () => {
  const state = reducer(base(), {type: 'setSyntax', syntax: 'datefns'});
  expect(state.syntax).toBe('datefns');
  expect(state.pattern).toContain('yyyy');
});

test('a shared link reproduces the sender state, not the visitor saved one', () => {
  const memory = new Map<string, string>();
  globalThis.localStorage ??= {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  } as Storage;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      syntax: 'datefns',
      pattern: 'yyyy',
      showDetails: false,
      clock: 'h23',
    }),
  );
  const shared = initialState(
    '?t=2026-10-26T14:30:00.000Z&tz=UTC&zones=UTC&fmt=YYYY-MM-DD',
  );
  expect(shared).toMatchObject({
    syntax: 'dayjs',
    pattern: 'YYYY-MM-DD',
    showDetails: true,
    clock: 'auto',
  });
  const plain = initialState('');
  expect(plain).toMatchObject({
    syntax: 'datefns',
    pattern: 'yyyy',
    showDetails: false,
    clock: 'h23',
  });
  localStorage.removeItem(STORAGE_KEY);
});

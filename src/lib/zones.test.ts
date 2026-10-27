import {expect, test} from 'bun:test';
import {allZones, cityName, searchZones, softInfo} from './zones';

test('zone list keeps modern names and legacy aliases, without duplicates', () => {
  const zones = allZones();
  expect(zones).toContain('Asia/Kolkata');
  expect(zones).toContain('Asia/Calcutta');
  expect(zones).toContain('UTC');
  expect(zones).toContain('America/Bogota');
  expect(new Set(zones).size).toBe(zones.length);
});

test('ambiguous abbreviation returns every candidate', () => {
  const zones = searchZones('CST').map((match) => match.timeZone);
  expect(zones).toContain('Asia/Shanghai');
  expect(zones).toContain('America/Chicago');
  expect(zones).toContain('America/Mexico_City');
});

test('search by city, IANA fragment and alias', () => {
  expect(searchZones('bogota')[0]?.timeZone).toBe('America/Bogota');
  expect(searchZones('new york')[0]?.timeZone).toBe('America/New_York');
  expect(searchZones('America/New_York')[0]?.timeZone).toBe('America/New_York');
  expect(searchZones('colombia').map((m) => m.timeZone)).toContain(
    'America/Bogota',
  );
  expect(searchZones('est').map((m) => m.timeZone)).toContain(
    'America/New_York',
  );
  expect(searchZones('xyzzy')).toEqual([]);
});

test('city names and soft metadata', () => {
  expect(cityName('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
  expect(cityName('UTC')).toBe('UTC');
  expect(softInfo('America/New_York')[0]?.daylight?.abbr).toBe('EDT');
});

test('legacy capitalized ids keep their tzdb spelling', () => {
  const zones = allZones();
  expect(zones).toContain('CST6CDT');
  expect(zones).toContain('EST5EDT');
  expect(zones).not.toContain('Cst6cdt');
});

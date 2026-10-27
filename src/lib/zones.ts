import soft from 'timezone-soft';
import spacetime from 'spacetime';
import {browserTimezone} from '@gobrand/tiempo';
import {Temporal} from '@js-temporal/polyfill';

spacetime.extend(soft);

export type SoftZone = ReturnType<typeof soft>[number];
export type ZoneName = {abbr: string; name: string; offset: number};

export function isSupportedZone(timeZone: string): boolean {
  try {
    Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(timeZone);
    return true;
  } catch {
    return false;
  }
}

let zoneList: string[] | null = null;

/** tzdb ids spelled in capitals, which spacetime re-capitalizes (`Cst6cdt`). */
const UPPERCASE_IDS = [
  'CET',
  'CST6CDT',
  'EET',
  'EST',
  'EST5EDT',
  'GB',
  'GB-Eire',
  'GMT',
  'GMT+0',
  'GMT-0',
  'GMT0',
  'HST',
  'MET',
  'MST',
  'MST7MDT',
  'NZ',
  'NZ-CHAT',
  'PRC',
  'PST8PDT',
  'ROC',
  'ROK',
  'UCT',
  'UTC',
  'W-SU',
  'WET',
];

/**
 * Every zone the engine supports: spacetime's list (what the original app
 * offered, including legacy aliases such as Asia/Calcutta) plus the runtime's.
 */
export function allZones(): string[] {
  if (zoneList) return zoneList;
  const runtime = Intl.supportedValuesOf?.('timeZone') ?? [];
  const spelling = new Map(
    [...UPPERCASE_IDS, ...runtime].map((zone) => [zone.toLowerCase(), zone]),
  );
  const now = spacetime.now();
  const names = Object.keys(spacetime.timezones()).map((key) => {
    const name = now.goto(key).timezone().name;
    return spelling.get(name.toLowerCase()) ?? name;
  });
  zoneList = [...new Set([...names, ...runtime, 'UTC'])]
    .filter(isSupportedZone)
    .sort();
  return zoneList;
}

/** `America/Argentina/Buenos_Aires` → `Buenos Aires`. */
export function cityName(timeZone: string): string {
  if (!timeZone.includes('/') || timeZone.startsWith('Etc/')) return timeZone;
  return timeZone.split('/').pop()!.replace(/_/g, ' ');
}

const softCache = new Map<string, SoftZone[]>();

/** Standard/daylight names and abbreviations known to timezone-soft. */
export function softInfo(timeZone: string): SoftZone[] {
  let cached = softCache.get(timeZone);
  if (!cached) {
    cached = soft(timeZone).filter((entry) => entry.iana === timeZone);
    if (!cached.length) cached = soft(timeZone).slice(0, 1);
    softCache.set(timeZone, cached);
  }
  return cached;
}

export function guessTimeZone(): string {
  const guess = browserTimezone();
  return isSupportedZone(guess) ? guess : 'UTC';
}

export type ZoneMatch = {
  timeZone: string;
  supported: boolean;
  /** Why it matched, when not by name (e.g. "CST · China Standard Time"). */
  via?: string;
};

const normalize = (text: string) =>
  text.toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Search by IANA name, city, and timezone-soft aliases/abbreviations. Ambiguous
 * aliases (e.g. CST) return every candidate instead of picking one.
 */
export function searchZones(query: string, limit = 60): ZoneMatch[] {
  const q = normalize(query);
  const zones = allZones();
  if (!q)
    return zones
      .slice(0, limit)
      .map((timeZone) => ({timeZone, supported: true}));

  const results = new Map<string, ZoneMatch>();
  const add = (match: ZoneMatch) => {
    if (!results.has(match.timeZone)) results.set(match.timeZone, match);
  };

  const exact = zones.filter(
    (zone) => normalize(zone) === q || normalize(cityName(zone)) === q,
  );
  exact.forEach((timeZone) => add({timeZone, supported: true}));

  for (const entry of soft(query.trim())) {
    const names = [entry.standard, entry.daylight]
      .filter((name): name is NonNullable<typeof name> => Boolean(name))
      .find(
        (name) =>
          name.abbr.toLowerCase() === q || name.name.toLowerCase().includes(q),
      );
    add({
      timeZone: entry.iana,
      supported: isSupportedZone(entry.iana),
      via: names ? `${names.abbr} · ${names.name}` : entry.name,
    });
  }

  const starts: string[] = [];
  const contains: string[] = [];
  for (const zone of zones) {
    const city = normalize(cityName(zone));
    const full = normalize(zone);
    if (city.startsWith(q) || full.startsWith(q)) starts.push(zone);
    else if (full.includes(q)) contains.push(zone);
  }
  [...starts, ...contains].forEach((timeZone) =>
    add({timeZone, supported: true}),
  );

  return [...results.values()].slice(0, limit);
}

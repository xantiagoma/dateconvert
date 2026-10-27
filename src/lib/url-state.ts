import {DEFAULT_INTL, canonicalLocale, type IntlSettings} from './intl';
import {
  DEFAULT_PATTERN,
  Temporal,
  formatIsoUtc,
  type ClockPreference,
} from './time';
import {isSupportedZone} from './zones';
import type {Syntax} from './pattern';

/**
 * Shareable state in the query string:
 *   ?t=2026-10-26T14:30:00.000Z   instant (ISO 8601 UTC, or epoch ms)
 *   &tz=America/Bogota            source zone
 *   &zones=America/Bogota,Asia/Tokyo
 *   &fmt=YYYY-MM-DD               custom pattern (only when not the default)
 *   &details=0                    details hidden (only when hidden)
 *   &lang=es-CO&cal=japanese&nu=arab&hc=h23   Intl settings (when set)
 *   &syn=datefns                  date-fns/tiempo pattern syntax
 *   &clock=12|24                  12/24-hour display (when not auto)
 *   &live=1                       follow the clock (then `t` is omitted)
 * Unknown or invalid values are ignored, never guessed.
 */
export type UrlState = {
  instant?: Temporal.Instant;
  sourceZone?: string;
  zones?: string[];
  pattern?: string;
  showDetails?: boolean;
  intl?: Partial<IntlSettings>;
  syntax?: Syntax;
  clock?: ClockPreference;
  live?: boolean;
};

export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const state: UrlState = {};

  const t = params.get('t');
  if (t) {
    try {
      state.instant = /^-?\d+$/.test(t)
        ? Temporal.Instant.fromEpochMilliseconds(Number(t))
        : Temporal.Instant.from(t);
    } catch {}
  }
  const tz = params.get('tz');
  if (tz && isSupportedZone(tz)) state.sourceZone = tz;
  const zones = params.get('zones');
  if (zones !== null) {
    state.zones = [
      ...new Set(
        zones
          .split(',')
          .map((zone) => zone.trim())
          .filter(isSupportedZone),
      ),
    ];
  }
  const fmt = params.get('fmt');
  if (fmt !== null) state.pattern = fmt;
  const details = params.get('details');
  if (details === '0' || details === '1') state.showDetails = details === '1';

  const intl: Partial<IntlSettings> = {};
  const lang = params.get('lang');
  const locale = lang && canonicalLocale(lang);
  if (locale) intl.locale = locale;
  for (const [key, field] of [
    ['cal', 'calendar'],
    ['nu', 'numberingSystem'],
    ['hc', 'hourCycle'],
  ] as const) {
    const value = params.get(key);
    if (value && /^[a-z0-9-]{2,30}$/i.test(value)) intl[field] = value;
  }
  if (Object.keys(intl).length) state.intl = intl;
  const syn = params.get('syn');
  if (syn === 'datefns' || syn === 'dayjs') state.syntax = syn;
  const clock = params.get('clock');
  if (clock === '12' || clock === '24')
    state.clock = clock === '12' ? 'h12' : 'h23';
  if (params.get('live') === '1') state.live = true;
  return state;
}

export function serializeUrlState(state: {
  instant: Temporal.Instant;
  sourceZone: string;
  zones: string[];
  pattern: string;
  showDetails: boolean;
  intl: IntlSettings;
  syntax?: Syntax;
  clock?: ClockPreference;
  live?: boolean;
}): string {
  const params = new URLSearchParams();
  if (state.live) params.set('live', '1');
  else params.set('t', formatIsoUtc(state.instant));
  params.set('tz', state.sourceZone);
  params.set('zones', state.zones.join(','));
  if (state.syntax === 'datefns') params.set('syn', 'datefns');
  if (state.clock === 'h12' || state.clock === 'h23') {
    params.set('clock', state.clock === 'h12' ? '12' : '24');
  }
  if (state.pattern !== DEFAULT_PATTERN) params.set('fmt', state.pattern);
  if (!state.showDetails) params.set('details', '0');
  if (state.intl.locale !== DEFAULT_INTL.locale)
    params.set('lang', state.intl.locale);
  if (state.intl.calendar) params.set('cal', state.intl.calendar);
  if (state.intl.numberingSystem) params.set('nu', state.intl.numberingSystem);
  if (state.intl.hourCycle) params.set('hc', state.intl.hourCycle);
  // Keep commas and slashes readable in the address bar.
  return `?${params.toString().replace(/%2C/g, ',').replace(/%2F/g, '/').replace(/%3A/g, ':')}`;
}

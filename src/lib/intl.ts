import {instantToDate} from '@xtandard/lib/temporal';
import {Temporal} from './time';

/** Locales offered first; any valid BCP 47 tag can also be typed. */
export const LOCALE_SUGGESTIONS: [string, string][] = [
  ['en-US', 'English (United States)'],
  ['en-GB', 'English (United Kingdom)'],
  ['es-CO', 'Español (Colombia)'],
  ['es-ES', 'Español (España)'],
  ['es-MX', 'Español (México)'],
  ['pt-BR', 'Português (Brasil)'],
  ['fr-FR', 'Français (France)'],
  ['de-DE', 'Deutsch (Deutschland)'],
  ['it-IT', 'Italiano (Italia)'],
  ['nl-NL', 'Nederlands'],
  ['sv-SE', 'Svenska'],
  ['pl-PL', 'Polski'],
  ['tr-TR', 'Türkçe'],
  ['ru-RU', 'Русский'],
  ['uk-UA', 'Українська'],
  ['ar-EG', 'العربية (مصر)'],
  ['he-IL', 'עברית'],
  ['fa-IR', 'فارسی'],
  ['hi-IN', 'हिन्दी'],
  ['th-TH', 'ไทย'],
  ['zh-CN', '中文 (简体)'],
  ['zh-TW', '中文 (繁體)'],
  ['ja-JP', '日本語'],
  ['ko-KR', '한국어'],
];

export const CALENDARS: [string, string][] = [
  ['', 'Locale default'],
  ['gregory', 'Gregorian'],
  ['iso8601', 'ISO 8601'],
  ['buddhist', 'Buddhist'],
  ['chinese', 'Chinese'],
  ['coptic', 'Coptic'],
  ['ethiopic', 'Ethiopic'],
  ['hebrew', 'Hebrew'],
  ['indian', 'Indian national'],
  ['islamic-umalqura', 'Islamic (Umm al-Qura)'],
  ['islamic-civil', 'Islamic (civil)'],
  ['japanese', 'Japanese'],
  ['persian', 'Persian'],
  ['roc', 'Republic of China'],
];

export const NUMBERING_SYSTEMS: [string, string][] = [
  ['', 'Locale default'],
  ['latn', 'Latin (0123)'],
  ['arab', 'Arabic-Indic (٠١٢٣)'],
  ['arabext', 'Persian (۰۱۲۳)'],
  ['beng', 'Bengali (০১২৩)'],
  ['deva', 'Devanagari (०१२३)'],
  ['fullwide', 'Full width (０１２３)'],
  ['hanidec', 'Chinese (〇一二三)'],
  ['thai', 'Thai (๐๑๒๓)'],
];

export const HOUR_CYCLES: [string, string][] = [
  ['', 'Locale default'],
  ['h23', '24-hour (0–23)'],
  ['h12', '12-hour (1–12)'],
  ['h11', '12-hour (0–11)'],
  ['h24', '24-hour (1–24)'],
];

export const STYLES = ['full', 'long', 'medium', 'short'] as const;
export type Style = (typeof STYLES)[number];

export const ZONE_NAME_STYLES = [
  'short',
  'long',
  'shortOffset',
  'longOffset',
  'shortGeneric',
  'longGeneric',
] as const;

export type IntlSettings = {
  locale: string;
  calendar: string;
  numberingSystem: string;
  hourCycle: string;
};

export const DEFAULT_INTL: IntlSettings = {
  locale:
    typeof navigator === 'undefined' ? 'en-US' : navigator.language || 'en-US',
  calendar: '',
  numberingSystem: '',
  hourCycle: '',
};

/** Canonical BCP 47 tag, or null when the runtime rejects it. */
export function canonicalLocale(tag: string): string | null {
  try {
    const [canonical] = Intl.getCanonicalLocales(tag.trim());
    return canonical ?? null;
  } catch {
    return null;
  }
}

export function displayLocale(tag: string, inLocale = 'en'): string {
  try {
    return new Intl.DisplayNames([inLocale], {type: 'language'}).of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/** The options object passed to Intl, without empty settings. */
export function buildOptions(
  settings: IntlSettings,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  return {
    timeZone,
    ...(settings.calendar && {calendar: settings.calendar}),
    ...(settings.numberingSystem && {
      numberingSystem: settings.numberingSystem,
    }),
    ...(settings.hourCycle && {
      hourCycle: settings.hourCycle as Intl.DateTimeFormatOptions['hourCycle'],
    }),
    ...options,
  };
}

export function formatIntl(
  instant: Temporal.Instant,
  settings: IntlSettings,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(
      settings.locale,
      buildOptions(settings, timeZone, options),
    ).format(instantToDate(instant));
  } catch (error) {
    return error instanceof Error ? `⚠ ${error.message}` : '⚠ Not supported';
  }
}

/** A copy-pasteable JS snippet producing the same output. */
export function intlSnippet(
  settings: IntlSettings,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const entries = Object.entries(buildOptions(settings, timeZone, options))
    .map(
      ([key, value]) => `${key}: ${JSON.stringify(value).replace(/"/g, "'")}`,
    )
    .join(', ');
  return `new Intl.DateTimeFormat('${settings.locale}', {${entries}}).format(date)`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365.2425 * 864e5],
  ['month', 30.436875 * 864e5],
  ['week', 7 * 864e5],
  ['day', 864e5],
  ['hour', 36e5],
  ['minute', 6e4],
  ['second', 1e3],
];

/** Largest whole unit between `instant` and `now`, e.g. "in 3 days". */
export function relativeTime(
  instant: Temporal.Instant,
  now: Temporal.Instant,
  locale: string,
  style: Intl.RelativeTimeFormatStyle = 'long',
  numeric: 'auto' | 'always' = 'auto',
): string {
  const diff = instant.epochMilliseconds - now.epochMilliseconds;
  const [unit, size] =
    UNITS.find(([, ms]) => Math.abs(diff) >= ms) ?? UNITS[UNITS.length - 1]!;
  try {
    return new Intl.RelativeTimeFormat(locale, {style, numeric}).format(
      Math.trunc(diff / size),
      unit,
    );
  } catch (error) {
    return error instanceof Error ? `⚠ ${error.message}` : '⚠ Not supported';
  }
}

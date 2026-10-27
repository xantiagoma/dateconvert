import type {Syntax} from './pattern';

export type TokenDoc = {token: string; group: TokenGroup; description: string};

export const TOKEN_GROUPS = [
  'Year',
  'Month',
  'Day',
  'Weekday',
  'Time',
  'Zone',
  'Epoch',
  'Other',
] as const;
export type TokenGroup = (typeof TOKEN_GROUPS)[number];

const DAYJS: TokenDoc[] = [
  {token: 'YYYY', group: 'Year', description: 'Four-digit year'},
  {token: 'YY', group: 'Year', description: 'Two-digit year'},
  {token: 'Q', group: 'Year', description: 'Quarter, 1–4'},
  {token: 'MMMM', group: 'Month', description: 'Month name'},
  {token: 'MMM', group: 'Month', description: 'Short month name'},
  {token: 'MM', group: 'Month', description: 'Month, 01–12'},
  {token: 'M', group: 'Month', description: 'Month, 1–12'},
  {token: 'DD', group: 'Day', description: 'Day of month, 01–31'},
  {token: 'D', group: 'Day', description: 'Day of month, 1–31'},
  {token: 'Do', group: 'Day', description: 'Day with ordinal, 1st–31st'},
  {token: 'dddd', group: 'Weekday', description: 'Weekday name'},
  {token: 'ddd', group: 'Weekday', description: 'Short weekday name'},
  {token: 'dd', group: 'Weekday', description: 'Min weekday name'},
  {token: 'd', group: 'Weekday', description: 'Weekday number, Sunday = 0'},
  {token: 'HH', group: 'Time', description: 'Hour, 00–23'},
  {token: 'H', group: 'Time', description: 'Hour, 0–23'},
  {token: 'hh', group: 'Time', description: 'Hour, 01–12 (needs A)'},
  {token: 'h', group: 'Time', description: 'Hour, 1–12 (needs A)'},
  {token: 'kk', group: 'Time', description: 'Hour, 01–24'},
  {token: 'mm', group: 'Time', description: 'Minute, 00–59'},
  {token: 'm', group: 'Time', description: 'Minute, 0–59'},
  {token: 'ss', group: 'Time', description: 'Second, 00–59'},
  {token: 's', group: 'Time', description: 'Second, 0–59'},
  {token: 'SSS', group: 'Time', description: 'Milliseconds, 000–999'},
  {token: 'A', group: 'Time', description: 'AM / PM'},
  {token: 'a', group: 'Time', description: 'am / pm'},
  {token: 'Z', group: 'Zone', description: 'Offset, +05:00'},
  {token: 'ZZ', group: 'Zone', description: 'Offset, +0500'},
  {token: 'z', group: 'Zone', description: 'Zone abbreviation, EDT'},
  {
    token: 'zzz',
    group: 'Zone',
    description: 'Zone name, Eastern Daylight Time',
  },
  {token: 'X', group: 'Epoch', description: 'Unix seconds'},
  {token: 'x', group: 'Epoch', description: 'Unix milliseconds'},
  {token: 'w', group: 'Other', description: 'Week of year'},
  {token: 'LLLL', group: 'Other', description: 'Localized long date and time'},
  {token: 'LT', group: 'Other', description: 'Localized time'},
  {token: '[text]', group: 'Other', description: 'Literal text, not formatted'},
];

const DATEFNS: TokenDoc[] = [
  {token: 'yyyy', group: 'Year', description: 'Four-digit year'},
  {token: 'yy', group: 'Year', description: 'Two-digit year'},
  {token: 'Q', group: 'Year', description: 'Quarter, 1–4'},
  {token: 'QQQ', group: 'Year', description: 'Quarter, Q1–Q4'},
  {token: 'G', group: 'Year', description: 'Era, AD'},
  {token: 'MMMM', group: 'Month', description: 'Month name (localized)'},
  {token: 'MMM', group: 'Month', description: 'Short month name (localized)'},
  {token: 'MM', group: 'Month', description: 'Month, 01–12'},
  {token: 'M', group: 'Month', description: 'Month, 1–12'},
  {token: 'dd', group: 'Day', description: 'Day of month, 01–31'},
  {token: 'd', group: 'Day', description: 'Day of month, 1–31'},
  {token: 'do', group: 'Day', description: 'Day with ordinal, 1st–31st'},
  {token: 'EEEE', group: 'Weekday', description: 'Weekday name (localized)'},
  {
    token: 'EEE',
    group: 'Weekday',
    description: 'Short weekday name (localized)',
  },
  {token: 'EEEEE', group: 'Weekday', description: 'Narrow weekday, M'},
  {token: 'HH', group: 'Time', description: 'Hour, 00–23'},
  {token: 'H', group: 'Time', description: 'Hour, 0–23'},
  {token: 'hh', group: 'Time', description: 'Hour, 01–12 (needs a)'},
  {token: 'h', group: 'Time', description: 'Hour, 1–12 (needs a)'},
  {token: 'mm', group: 'Time', description: 'Minute, 00–59'},
  {token: 'ss', group: 'Time', description: 'Second, 00–59'},
  {token: 'SSS', group: 'Time', description: 'Milliseconds, 000–999'},
  {token: 'a', group: 'Time', description: 'AM / PM (localized)'},
  {token: 'xxx', group: 'Zone', description: 'Offset, +05:00'},
  {token: 'xx', group: 'Zone', description: 'Offset, +0500'},
  {token: 'XXX', group: 'Zone', description: 'Offset, or Z for UTC'},
  {token: 'z', group: 'Zone', description: 'Zone abbreviation, EDT'},
  {token: 'zzzz', group: 'Zone', description: 'Zone name (localized)'},
  {token: 't', group: 'Epoch', description: 'Unix seconds'},
  {token: 'T', group: 'Epoch', description: 'Unix milliseconds'},
  {
    token: "'text'",
    group: 'Other',
    description: "Literal text; '' for a quote",
  },
];

export const TOKEN_DOCS: Record<Syntax, TokenDoc[]> = {
  dayjs: DAYJS,
  datefns: DATEFNS,
};

const byToken = Object.fromEntries(
  (Object.keys(TOKEN_DOCS) as Syntax[]).map((syntax) => [
    syntax,
    new Map(TOKEN_DOCS[syntax].map((doc) => [doc.token, doc])),
  ]),
) as Record<Syntax, Map<string, TokenDoc>>;

export function tokenDoc(syntax: Syntax, token: string): TokenDoc | undefined {
  return byToken[syntax].get(token);
}

/** Tokens starting with `prefix` (case-sensitive: `M` month vs `m` minute). */
export function suggestTokens(syntax: Syntax, prefix: string): TokenDoc[] {
  if (!prefix) return [];
  return TOKEN_DOCS[syntax].filter(
    (doc) => doc.token.startsWith(prefix) && !/^[[']/.test(doc.token),
  );
}

export const PRESETS: Record<Syntax, [name: string, pattern: string][]> = {
  dayjs: [
    ['Original DateConvert', 'dddd MMMM Do YYYY hh:mm:ss.SSS A (z: UTCZ)'],
    ['Date and time', 'YYYY-MM-DD HH:mm:ss'],
    ['With milliseconds and offset', 'YYYY-MM-DD HH:mm:ss.SSS Z'],
    ['Long, localized', 'LLLL'],
    ['US', 'MM/DD/YYYY h:mm A'],
    ['European', 'DD.MM.YYYY HH:mm'],
    ['Zone name', 'HH:mm z (zzz)'],
    ['Unix seconds / ms', 'X / x'],
  ],
  datefns: [
    [
      'Original, date-fns tokens',
      'EEEE, MMMM do yyyy hh:mm:ss.SSS a (zzz, xxx)',
    ],
    ['Date and time', 'yyyy-MM-dd HH:mm:ss'],
    ['With milliseconds and offset', 'yyyy-MM-dd HH:mm:ss.SSS xxx'],
    ['Long, localized', "EEEE d 'de' MMMM 'de' yyyy, HH:mm"],
    ['US', 'MM/dd/yyyy h:mm a'],
    ['European', 'dd.MM.yyyy HH:mm'],
    ['Zone name', 'HH:mm z (zzzz)'],
    ['Unix seconds / ms', 't / T'],
  ],
};

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import {DEFAULT_INTL, canonicalLocale, type IntlSettings} from './intl';
import type {Syntax} from './pattern';
import {
  DEFAULT_PATTERN,
  Temporal,
  nowInstant,
  uses12Hour,
  type ClockPreference,
} from './time';

export const DEFAULT_PATTERNS: Record<Syntax, string> = {
  dayjs: DEFAULT_PATTERN,
  datefns: 'EEEE, MMMM do yyyy hh:mm:ss.SSS a (zzz, xxx)',
};
import {parseUrlState, serializeUrlState} from './url-state';
import {guessTimeZone, isSupportedZone} from './zones';

/**
 * The single source of truth: one instant plus presentation choices. Every
 * representation is derived from `instant`; text drafts live in the fields.
 */
export type State = {
  instant: Temporal.Instant;
  sourceZone: string;
  zones: string[];
  pattern: string;
  showDetails: boolean;
  intl: IntlSettings;
  syntax: Syntax;
  /** 12/24-hour display; `auto` follows the locale. */
  clock: ClockPreference;
  /** Follow the clock; any edit turns it off. */
  live: boolean;
};

/** Everything except the instant and live mode survives reloads. */
type Preferences = Omit<State, 'instant' | 'live'>;

export type Action =
  | {type: 'setInstant'; instant: Temporal.Instant}
  | {type: 'tick'; instant: Temporal.Instant}
  | {type: 'setLive'; value: boolean}
  | {type: 'setSyntax'; syntax: Syntax}
  | {type: 'setClock'; clock: ClockPreference}
  | {type: 'setSourceZone'; zone: string}
  | {type: 'addZone'; zone: string}
  | {type: 'removeZone'; zone: string}
  | {type: 'resetZones'}
  | {type: 'resetAll'}
  | {type: 'setPattern'; pattern: string}
  | {type: 'setShowDetails'; value: boolean}
  | {type: 'setIntl'; intl: Partial<IntlSettings>};

export const STORAGE_KEY = 'dc-preferences-v1';
const POPULAR_ZONES = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];

export function defaultZones(local: string): string[] {
  return [...new Set([local, ...POPULAR_ZONES])];
}

export function defaultPreferences(local = guessTimeZone()): Preferences {
  return {
    sourceZone: local,
    zones: defaultZones(local),
    pattern: DEFAULT_PATTERN,
    showDetails: true,
    intl: DEFAULT_INTL,
    syntax: 'dayjs',
    clock: 'auto',
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setInstant':
      // A manual edit always wins over the clock.
      return action.instant.equals(state.instant) && !state.live
        ? state
        : {...state, instant: action.instant, live: false};
    case 'tick':
      return state.live ? {...state, instant: action.instant} : state;
    case 'setLive':
      return {
        ...state,
        live: action.value,
        instant: action.value ? nowInstant() : state.instant,
      };
    case 'setClock':
      return {...state, clock: action.clock};
    case 'setSyntax':
      return state.syntax === action.syntax
        ? state
        : {
            ...state,
            syntax: action.syntax,
            pattern: DEFAULT_PATTERNS[action.syntax],
          };
    case 'setSourceZone':
      return {...state, sourceZone: action.zone};
    case 'addZone':
      return state.zones.includes(action.zone)
        ? state
        : {...state, zones: [...state.zones, action.zone]};
    case 'removeZone':
      return {
        ...state,
        zones: state.zones.filter((zone) => zone !== action.zone),
      };
    case 'resetZones':
      return {...state, zones: defaultZones(guessTimeZone())};
    case 'resetAll':
      return {...state, ...defaultPreferences()};
    case 'setPattern':
      return {...state, pattern: action.pattern};
    case 'setShowDetails':
      return {...state, showDetails: action.value};
    case 'setIntl':
      return {...state, intl: {...state.intl, ...action.intl}};
  }
}

/** Saved preferences, validated field by field; bad data falls back. */
export function loadPreferences(raw: string | null): Preferences {
  const defaults = defaultPreferences();
  if (!raw) return defaults;
  try {
    const saved = JSON.parse(raw) as Partial<Preferences>;
    const zones = Array.isArray(saved.zones)
      ? saved.zones.filter(
          (zone): zone is string =>
            typeof zone === 'string' && isSupportedZone(zone),
        )
      : defaults.zones;
    const intl = {...defaults.intl, ...(saved.intl ?? {})};
    return {
      sourceZone:
        typeof saved.sourceZone === 'string' &&
        isSupportedZone(saved.sourceZone)
          ? saved.sourceZone
          : defaults.sourceZone,
      zones: [...new Set(zones)],
      pattern:
        typeof saved.pattern === 'string' ? saved.pattern : defaults.pattern,
      showDetails:
        typeof saved.showDetails === 'boolean'
          ? saved.showDetails
          : defaults.showDetails,
      intl: canonicalLocale(intl.locale) ? intl : defaults.intl,
      syntax: saved.syntax === 'datefns' ? 'datefns' : 'dayjs',
      clock:
        saved.clock === 'h12' || saved.clock === 'h23' ? saved.clock : 'auto',
    };
  } catch {
    return defaults;
  }
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Saved preferences, then anything in the URL on top (a shared link wins for
 * this visit). The instant comes from the URL or is "now".
 */
export function initialState(
  search = typeof location === 'undefined' ? '' : location.search,
): State {
  const saved = loadPreferences(readStorage());
  const url = parseUrlState(search);
  // A shared link (it carries `t` or `live`) omits values that were at their
  // defaults, so absent keys mean "default", not "whatever this visitor saved".
  const shared = url.instant !== undefined || url.live === true;
  const base = shared ? {...defaultPreferences(), intl: saved.intl} : saved;
  return {
    ...base,
    instant: url.instant ?? nowInstant(),
    sourceZone: url.sourceZone ?? base.sourceZone,
    zones: url.zones ?? base.zones,
    pattern:
      url.pattern ?? (url.syntax ? DEFAULT_PATTERNS[url.syntax] : base.pattern),
    showDetails: url.showDetails ?? base.showDetails,
    intl: {
      ...base.intl,
      ...(shared && {calendar: '', numberingSystem: '', hourCycle: ''}),
      ...url.intl,
    },
    syntax: url.syntax ?? base.syntax,
    clock: url.clock ?? base.clock,
    live: url.live ?? false,
  };
}

export function shareUrl(state: State): string {
  return `${location.origin}${location.pathname}${serializeUrlState(state)}`;
}

type Store = {
  state: State;
  dispatch: React.Dispatch<Action>;
  /** The instant in the source zone. */
  source: Temporal.ZonedDateTime;
  /** Resolved 12-hour display for the app's own times. */
  h12: boolean;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: State;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    initial,
    (value) => value ?? initialState(),
  );
  const {sourceZone, zones, pattern, showDetails, intl, syntax, clock, live} =
    state;

  // Live mode: follow the clock, ticking on each second boundary.
  useEffect(() => {
    if (!live) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      dispatch({type: 'tick', instant: nowInstant()});
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(timer);
  }, [live]);

  // Persist preferences, but not the ones a shared link imposed on first load:
  // only once the visitor changes something.
  const loadedFromUrl = useRef(
    typeof location !== 'undefined' && location.search.length > 1,
  );
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      if (loadedFromUrl.current) return;
    }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sourceZone,
          zones,
          pattern,
          showDetails,
          intl,
          syntax,
          clock,
        }),
      );
    } catch {}
  }, [sourceZone, zones, pattern, showDetails, intl, syntax, clock]);

  // Keep the address bar shareable without adding history entries.
  useEffect(() => {
    const timer = setTimeout(() => {
      const search = serializeUrlState(state);
      if (search !== location.search) {
        history.replaceState(
          history.state,
          '',
          `${location.pathname}${search}${location.hash}`,
        );
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [state]);

  const source = useMemo(
    () => state.instant.toZonedDateTimeISO(state.sourceZone),
    [state.instant, state.sourceZone],
  );
  const h12 = uses12Hour(state.clock, state.intl.locale);
  const value = useMemo(
    () => ({state, dispatch, source, h12}),
    [state, source, h12],
  );
  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

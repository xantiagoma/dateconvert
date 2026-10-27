import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  CalendarIcon,
  ChevronsUpDownIcon,
  ClockIcon,
  RadioIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import {useDraftField} from '@/hooks/use-draft-field';
import {segmentAt, segments, step, type SegmentKind} from '@/lib/segments';
import {useStore} from '@/lib/store';
import {
  foldAlternatives,
  formatOffset,
  formatOffsetDateTime,
  formatPlainDate,
  formatPlainTime,
  longDate,
  nowInstant,
  parsePlainDate,
  parsePlainTime,
  parseWallTime,
  parseZonedDateTime,
  shortZoneName,
  type ClockPreference,
  type DstGap,
  type ParseResult,
} from '@/lib/time';
import {cityName} from '@/lib/zones';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import {Label} from '@/components/ui/label';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Switch} from '@/components/ui/switch';
import {ToggleGroup, ToggleGroupItem} from '@/components/ui/toggle-group';
import {MonthCalendar} from './month-calendar';
import {RepresentationField} from './representation-field';
import {TimePicker} from './time-picker';
import {TimezonePicker} from './timezone-picker';

type Commit = (result: Extract<ParseResult, {ok: true}>) => void;
type Reject = (result: Extract<ParseResult, {ok: false}>) => void;

/**
 * A date or time text field whose number runs are sections: type freely, or
 * put the caret in a section and use ↑/↓ to step it (carrying over).
 */
function SectionedField({
  label,
  labelAction,
  kind,
  value,
  parse,
  onCommit,
  onRejected,
  onStep,
  placeholder,
  addon,
}: {
  label: string;
  labelAction?: ReactNode;
  kind: 'date' | 'time';
  value: string;
  parse: (text: string) => ParseResult;
  onCommit: Commit;
  onRejected: Reject;
  onStep: (segment: SegmentKind, delta: 1 | -1) => void;
  placeholder: string;
  addon: ReactNode;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const reselect = useRef<SegmentKind | null>(null);
  const field = useDraftField({value, parse, onCommit, onRejected});

  // After a step, re-select the same section in the re-rendered text.
  useLayoutEffect(() => {
    const kindToSelect = reselect.current;
    if (!kindToSelect || !input.current) return;
    reselect.current = null;
    const part = segments(value, kind).find((s) => s.kind === kindToSelect);
    if (part) input.current.setSelectionRange(part.start, part.end);
  }, [value, kind]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
      !event.altKey &&
      !event.metaKey
    ) {
      // Only step from a valid value; an invalid draft stays as typed.
      if (field.error || field.pending) return;
      event.preventDefault();
      const caret = event.currentTarget.selectionStart ?? 0;
      const part = segmentAt(field.text, kind, caret);
      if (!part) return;
      field.reset();
      reselect.current = part.kind;
      onStep(part.kind, event.key === 'ArrowUp' ? 1 : -1);
      return;
    }
    field.inputProps.onKeyDown(event);
  };

  return (
    <Field data-invalid={field.error ? true : undefined} className="min-w-0">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {labelAction}
      </div>
      <InputGroup className="h-11 bg-card">
        <InputGroupInput
          ref={input}
          id={id}
          {...field.inputProps}
          onKeyDown={onKeyDown}
          className="font-mono text-base tabular"
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          aria-describedby={`${id}-help`}
        />
        <InputGroupAddon align="inline-end">{addon}</InputGroupAddon>
      </InputGroup>
      {field.error ? (
        <FieldError id={`${id}-help`}>{field.error}</FieldError>
      ) : (
        <FieldDescription id={`${id}-help`} className="text-xs">
          {field.pending
            ? 'Not applied yet.'
            : 'Type, pick, or use ↑ ↓ on a section.'}
        </FieldDescription>
      )}
    </Field>
  );
}

const CLOCKS: [ClockPreference, string][] = [
  ['auto', 'Auto'],
  ['h12', '12h'],
  ['h23', '24h'],
];

function ClockToggle() {
  const {state, dispatch} = useStore();
  return (
    <ToggleGroup
      size="sm"
      variant="outline"
      spacing={0}
      value={[state.clock]}
      onValueChange={(values: string[]) => {
        const next = values[0] as ClockPreference | undefined;
        if (next) dispatch({type: 'setClock', clock: next});
      }}
      aria-label="Clock format"
    >
      {CLOCKS.map(([value, label]) => (
        <ToggleGroupItem key={value} value={value} className="h-6 px-2 text-xs">
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function SourceZonePicker() {
  const {state, dispatch, source} = useStore();
  const [open, setOpen] = useState(false);
  const id = useId();
  const abbr = shortZoneName(source);
  return (
    <Field className="min-w-0 flex-1">
      <FieldLabel id={id}>Timezone (IANA)</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="h-11 w-full justify-between gap-3 bg-card px-3 text-left"
              aria-labelledby={`${id} ${id}-value`}
            />
          }
        >
          <span
            id={`${id}-value`}
            className="flex min-w-0 flex-col leading-tight"
          >
            <span className="truncate font-medium">{state.sourceZone}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {cityName(state.sourceZone)} · {formatOffset(source.offset)}
              {abbr ? ` · ${abbr}` : null}
            </span>
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(26rem,calc(100vw-2rem))] p-0"
        >
          <TimezonePicker
            instant={state.instant}
            current={state.sourceZone}
            onSelect={(zone) => {
              dispatch({type: 'setSourceZone', zone});
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function GapAlert({
  gap,
  zone,
  onPick,
}: {
  gap: DstGap;
  zone: string;
  onPick: Commit;
}) {
  const hm = (zdt: DstGap['before']) =>
    zdt.toPlainTime().toString({smallestUnit: 'minute'});
  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlertIcon />
      <AlertTitle>This time is skipped by a DST change</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          Clocks in {cityName(zone)} jump from {hm(gap.before)}{' '}
          {formatOffset(gap.before.offset)} straight to {hm(gap.after)}{' '}
          {formatOffset(gap.after.offset)}. Pick the instant you mean:
        </p>
        <div className="flex flex-wrap gap-2">
          {[gap.before, gap.after].map((zdt) => (
            <Button
              key={zdt.offset}
              variant="outline"
              size="sm"
              className="font-mono"
              onClick={() => onPick({ok: true, instant: zdt.toInstant()})}
            >
              {formatOffsetDateTime(zdt)}
            </Button>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function FoldAlert({onPick}: {onPick: Commit}) {
  const {state, source, h12} = useStore();
  const fold = foldAlternatives(source);
  if (!fold) return null;
  return (
    <Alert>
      <ClockIcon />
      <AlertTitle>
        This time happens twice in {cityName(state.sourceZone)}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          Clocks fall back here, so {formatPlainTime(source, h12)} occurs once
          per offset. Choose which one:
        </p>
        <ToggleGroup
          variant="outline"
          value={[source.offset]}
          onValueChange={(values: string[]) => {
            const pick = [fold.earlier, fold.later].find(
              (zdt) => zdt.offset === values[0],
            );
            if (pick) onPick({ok: true, instant: pick.toInstant()});
          }}
          aria-label="Occurrence"
        >
          {[fold.earlier, fold.later].map((zdt, index) => (
            <ToggleGroupItem
              key={zdt.offset}
              value={zdt.offset}
              className="font-mono"
            >
              {index === 0 ? 'First' : 'Second'} · {formatOffset(zdt.offset)}{' '}
              {shortZoneName(zdt)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </AlertDescription>
    </Alert>
  );
}

/** Wall-clock editor: date + time in the source zone, the zone, now/live. */
export function DateTimeEditor() {
  const {state, dispatch, source, h12} = useStore();
  const zone = state.sourceZone;
  const [gapState, setGap] = useState<{gap: DstGap; at: string} | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);

  // A gap notice only applies to the instant and zone it was raised for.
  const stamp = `${state.instant.epochNanoseconds}|${zone}`;
  const gap = gapState?.at === stamp ? gapState.gap : null;

  const commit = useCallback<Commit>(
    (result) => dispatch({type: 'setInstant', instant: result.instant}),
    [dispatch],
  );
  const rejected = useCallback<Reject>(
    (result) => setGap(result.gap ? {gap: result.gap, at: stamp} : null),
    [stamp],
  );
  const commitWall = (result: ParseResult) =>
    result.ok ? commit(result) : rejected(result);
  const stepBy = (kind: SegmentKind, delta: 1 | -1) =>
    dispatch({
      type: 'setInstant',
      instant: step(source, kind, delta).toInstant(),
    });

  const parseDate = (text: string): ParseResult => {
    const date = parsePlainDate(text);
    return typeof date === 'string'
      ? {ok: false, message: date}
      : parseWallTime(date, source.toPlainTime(), zone);
  };
  const parseTime = (text: string): ParseResult => {
    const time = parsePlainTime(text);
    return typeof time === 'string'
      ? {ok: false, message: time}
      : parseWallTime(source.toPlainDate(), time, zone);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SectionedField
          label="Date"
          kind="date"
          value={formatPlainDate(source)}
          parse={parseDate}
          onCommit={commit}
          onRejected={rejected}
          onStep={stepBy}
          placeholder="YYYY-MM-DD"
          addon={
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                render={
                  <InputGroupButton
                    size="icon-sm"
                    aria-label="Choose date from calendar"
                  />
                }
              >
                <CalendarIcon />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-76">
                <MonthCalendar
                  key={formatPlainDate(source)}
                  value={source.toPlainDate()}
                  timeZone={zone}
                  onSelect={(picked) => {
                    commitWall(
                      parseWallTime(picked, source.toPlainTime(), zone),
                    );
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          }
        />
        <SectionedField
          label="Time"
          labelAction={<ClockToggle />}
          kind="time"
          value={formatPlainTime(source, h12)}
          parse={parseTime}
          onCommit={commit}
          onRejected={rejected}
          onStep={stepBy}
          placeholder={h12 ? 'h:mm:ss AM' : 'HH:mm:ss'}
          addon={
            <>
              <InputGroupText className="font-mono text-xs">
                {shortZoneName(source)}
              </InputGroupText>
              <Popover open={clockOpen} onOpenChange={setClockOpen}>
                <PopoverTrigger
                  render={
                    <InputGroupButton size="icon-sm" aria-label="Choose time" />
                  }
                >
                  <ClockIcon />
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <TimePicker
                    value={source.toPlainTime()}
                    h12={h12}
                    onChange={(time) =>
                      commitWall(
                        parseWallTime(source.toPlainDate(), time, zone),
                      )
                    }
                    onNow={() => {
                      dispatch({type: 'setInstant', instant: nowInstant()});
                      setClockOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </>
          }
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SourceZonePicker />
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            className="h-11 flex-1 px-5 sm:flex-none"
            onClick={() =>
              dispatch({type: 'setInstant', instant: nowInstant()})
            }
          >
            Use now
          </Button>
          <div className="flex items-center gap-2">
            <Switch
              id="live"
              checked={state.live}
              onCheckedChange={(value) => dispatch({type: 'setLive', value})}
            />
            <Label htmlFor="live" className="flex items-center gap-1">
              <RadioIcon
                className={
                  state.live ? 'size-3.5 animate-pulse text-brand' : 'size-3.5'
                }
                aria-hidden
              />
              Live
            </Label>
          </div>
        </div>
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">
        {longDate(source)} at {formatPlainTime(source, h12)} in {cityName(zone)}{' '}
        ({formatOffset(source.offset)})
        {state.live ? '. Following the clock; any edit stops it.' : '.'}
      </p>

      {gap ? <GapAlert gap={gap} zone={zone} onPick={commit} /> : null}
      <FoldAlert onPick={commit} />

      <RepresentationField
        label="Date with offset"
        value={formatOffsetDateTime(source)}
        parse={parseZonedDateTime}
        onCommit={commit}
        placeholder="2026-10-26T09:30:00-05:00"
        description="ISO 8601 in the source zone. Any explicit offset sets the instant."
      />
    </div>
  );
}

export function useCommitInstant(): Commit {
  const {dispatch} = useStore();
  return useCallback<Commit>(
    (result) => dispatch({type: 'setInstant', instant: result.instant}),
    [dispatch],
  );
}

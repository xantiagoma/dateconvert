import {useDeferredValue, useEffect, useId, useState} from 'react';
import {ChevronsUpDownIcon, CodeIcon} from 'lucide-react';
import {
  CALENDARS,
  HOUR_CYCLES,
  LOCALE_SUGGESTIONS,
  NUMBERING_SYSTEMS,
  STYLES,
  ZONE_NAME_STYLES,
  canonicalLocale,
  displayLocale,
  formatIntl,
  intlSnippet,
  relativeTime,
  type IntlSettings,
} from '@/lib/intl';
import {useStore} from '@/lib/store';
import {Temporal, nowInstant} from '@/lib/time';
import {cityName} from '@/lib/zones';
import {Button} from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {Field, FieldLabel} from '@/components/ui/field';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {CopyButton} from './copy-button';

/** Base UI Select needs a non-empty value; '' (locale default) maps to this. */
const AUTO = 'auto';
const toItems = (options: [string, string][]) =>
  options.map(([value, label]) => ({value: value || AUTO, label}));

function OptionSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, string][];
  value: string;
  onChange: (value: string) => void;
}) {
  const items = toItems(options);
  return (
    <Field className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <Select
        items={items}
        value={value || AUTO}
        onValueChange={(next) => onChange(next === AUTO ? '' : String(next))}
      >
        <SelectTrigger className="h-10 w-full bg-card" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function LocalePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (locale: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const id = useId();
  const q = deferred.trim().toLowerCase();
  const matches = LOCALE_SUGGESTIONS.filter(
    ([tag, name]) =>
      !q ||
      tag.toLowerCase().includes(q) ||
      name.toLowerCase().includes(q) ||
      displayLocale(tag).toLowerCase().includes(q),
  );
  const typed = canonicalLocale(deferred);
  const custom =
    typed && !LOCALE_SUGGESTIONS.some(([tag]) => tag === typed) ? typed : null;
  const pick = (tag: string) => {
    onChange(tag);
    setOpen(false);
    setQuery('');
  };

  return (
    <Field className="min-w-0">
      <FieldLabel id={id}>Locale</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="h-10 w-full justify-between bg-card px-3"
              aria-labelledby={`${id} ${id}-value`}
            />
          }
        >
          <span id={`${id}-value`} className="truncate">
            <span className="font-mono">{value}</span>{' '}
            <span className="text-muted-foreground">
              {displayLocale(value)}
            </span>
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command shouldFilter={false} loop>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Language or BCP 47 tag (es-CO)…"
              aria-label="Search locales"
            />
            <CommandList className="max-h-72">
              <CommandEmpty>Not a valid locale tag.</CommandEmpty>
              {custom ? (
                <CommandGroup heading="Custom">
                  <CommandItem value={custom} onSelect={() => pick(custom)}>
                    <span className="font-mono">{custom}</span>
                    <span className="text-muted-foreground">
                      {displayLocale(custom)}
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null}
              <CommandGroup heading="Common">
                {matches.map(([tag, name]) => (
                  <CommandItem
                    key={tag}
                    value={tag}
                    data-checked={tag === value ? true : undefined}
                    onSelect={() => pick(tag)}
                  >
                    <span className="w-14 font-mono">{tag}</span>
                    <span className="truncate">{name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function OutputRow({
  label,
  value,
  code,
}: {
  label: React.ReactNode;
  value: string;
  code: string;
}) {
  return (
    <div className="grid items-center gap-x-4 gap-y-1 border-b py-2.5 last:border-b-0 sm:grid-cols-[11rem_1fr_auto]">
      <div className="font-mono text-xs text-muted-foreground">{label}</div>
      <div className="min-w-0 text-base break-words">{value}</div>
      <div className="flex gap-1">
        <CopyButton
          value={value}
          label={`${String(label)} output`}
          size="icon-sm"
          variant="ghost"
        />
        <CopyButton
          value={code}
          label={`${String(label)} code`}
          size="icon-sm"
          variant="ghost"
        />
      </div>
    </div>
  );
}

/** "Now" for relative times, refreshed while mounted (external clock). */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(nowInstant);
  useEffect(() => {
    const timer = setInterval(() => setNow(nowInstant()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

type BuilderOptions = Partial<Record<keyof typeof BUILDER_FIELDS, string>>;

const BUILDER_FIELDS = {
  weekday: ['narrow', 'short', 'long'],
  era: ['narrow', 'short', 'long'],
  year: ['numeric', '2-digit'],
  month: ['numeric', '2-digit', 'narrow', 'short', 'long'],
  day: ['numeric', '2-digit'],
  hour: ['numeric', '2-digit'],
  minute: ['numeric', '2-digit'],
  second: ['numeric', '2-digit'],
  fractionalSecondDigits: ['1', '2', '3'],
  dayPeriod: ['narrow', 'short', 'long'],
  timeZoneName: [...ZONE_NAME_STYLES],
} as const;

const DEFAULT_BUILDER: BuilderOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
};

function builderToOptions(builder: BuilderOptions): Intl.DateTimeFormatOptions {
  return Object.fromEntries(
    Object.entries(builder)
      .filter(([, value]) => value)
      .map(([key, value]) => [
        key,
        key === 'fractionalSecondDigits' ? Number(value) : value,
      ]),
  ) as Intl.DateTimeFormatOptions;
}

function Builder({
  instant,
  settings,
  zone,
}: {
  instant: Temporal.Instant;
  settings: IntlSettings;
  zone: string;
}) {
  const [builder, setBuilder] = useState<BuilderOptions>(DEFAULT_BUILDER);
  const options = builderToOptions(builder);
  const output = formatIntl(instant, settings, zone, options);
  const code = intlSnippet(settings, zone, options);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(Object.keys(BUILDER_FIELDS) as (keyof typeof BUILDER_FIELDS)[]).map(
          (key) => (
            <OptionSelect
              key={key}
              label={key}
              options={[
                ['', '—'],
                ...BUILDER_FIELDS[key].map((value): [string, string] => [
                  value,
                  value,
                ]),
              ]}
              value={builder[key] ?? ''}
              onChange={(value) =>
                setBuilder((current) => ({
                  ...current,
                  [key]: value || undefined,
                }))
              }
            />
          ),
        )}
      </div>
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
        <div className="flex items-start gap-2">
          <output className="min-w-0 flex-1 text-xl break-words">
            {output}
          </output>
          <CopyButton
            value={output}
            label="Intl output"
            size="icon-sm"
            variant="ghost"
          />
        </div>
        <div className="flex items-start gap-2 border-t pt-2">
          <CodeIcon
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <code className="min-w-0 flex-1 font-mono text-xs break-all text-muted-foreground">
            {code}
          </code>
          <CopyButton
            value={code}
            label="Intl code"
            size="icon-sm"
            variant="ghost"
          />
        </div>
      </div>
    </div>
  );
}

export function IntlSection() {
  const {state, dispatch} = useStore();
  const settings = state.intl;
  const zones = [...new Set([state.sourceZone, ...state.zones])];
  const [chosenZone, setZone] = useState(state.sourceZone);
  // Fall back to the source if the chosen zone was removed.
  const zone = zones.includes(chosenZone) ? chosenZone : state.sourceZone;
  const now = useNow(15_000);
  const set = (intl: Partial<IntlSettings>) =>
    dispatch({type: 'setIntl', intl});
  const run = (options: Intl.DateTimeFormatOptions) =>
    formatIntl(state.instant, settings, zone, options);
  const code = (options: Intl.DateTimeFormatOptions) =>
    intlSnippet(settings, zone, options);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <LocalePicker
          value={settings.locale}
          onChange={(locale) => set({locale})}
        />
        <OptionSelect
          label="Timezone"
          options={zones.map((z): [string, string] => [z, cityName(z)])}
          value={zone}
          onChange={(value) => setZone(value)}
        />
        <OptionSelect
          label="Calendar"
          options={CALENDARS}
          value={settings.calendar}
          onChange={(calendar) => set({calendar})}
        />
        <OptionSelect
          label="Numbering"
          options={NUMBERING_SYSTEMS}
          value={settings.numberingSystem}
          onChange={(numberingSystem) => set({numberingSystem})}
        />
        <OptionSelect
          label="Hour cycle"
          options={HOUR_CYCLES}
          value={settings.hourCycle}
          onChange={(hourCycle) => set({hourCycle})}
        />
      </div>

      <Tabs defaultValue="styles">
        <TabsList className="flex-wrap">
          <TabsTrigger value="styles">Styles</TabsTrigger>
          <TabsTrigger value="zones">Zone names</TabsTrigger>
          <TabsTrigger value="relative">Relative</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
        </TabsList>
        <TabsContent value="styles" className="pt-2">
          {STYLES.map((style) => (
            <OutputRow
              key={`date-${style}`}
              label={`dateStyle: ${style}`}
              value={run({dateStyle: style})}
              code={code({dateStyle: style})}
            />
          ))}
          {STYLES.map((style) => (
            <OutputRow
              key={`time-${style}`}
              label={`timeStyle: ${style}`}
              value={run({timeStyle: style})}
              code={code({timeStyle: style})}
            />
          ))}
          {STYLES.map((style) => (
            <OutputRow
              key={`both-${style}`}
              label={`date + time: ${style}`}
              value={run({dateStyle: style, timeStyle: style})}
              code={code({dateStyle: style, timeStyle: style})}
            />
          ))}
        </TabsContent>
        <TabsContent value="zones" className="pt-2">
          {ZONE_NAME_STYLES.map((style) => (
            <OutputRow
              key={style}
              label={`timeZoneName: ${style}`}
              value={run({
                timeZoneName: style,
                hour: 'numeric',
                minute: '2-digit',
              })}
              code={code({
                timeZoneName: style,
                hour: 'numeric',
                minute: '2-digit',
              })}
            />
          ))}
        </TabsContent>
        <TabsContent value="relative" className="pt-2">
          <p className="pb-2 text-sm text-muted-foreground">
            Relative to the current time; refreshes every 15 seconds.
          </p>
          {(['long', 'short', 'narrow'] as const).flatMap((style) =>
            (['auto', 'always'] as const).map((numeric) => (
              <OutputRow
                key={`${style}-${numeric}`}
                label={`${style}, numeric: ${numeric}`}
                value={relativeTime(
                  state.instant,
                  now,
                  settings.locale,
                  style,
                  numeric,
                )}
                code={`new Intl.RelativeTimeFormat('${settings.locale}', {style: '${style}', numeric: '${numeric}'})`}
              />
            )),
          )}
        </TabsContent>
        <TabsContent value="builder" className="pt-2">
          <Builder instant={state.instant} settings={settings} zone={zone} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

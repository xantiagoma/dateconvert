import {Suspense, lazy, useState} from 'react';
import {
  BookOpenIcon,
  ChevronDownIcon,
  ClockIcon,
  MonitorIcon,
  MoonIcon,
  PlusIcon,
  RotateCcwIcon,
  Share2Icon,
  SunIcon,
} from 'lucide-react';
import {toast} from 'sonner';
import {shareUrl, useStore} from '@/lib/store';
import {
  epochMilliseconds,
  epochSeconds,
  formatDayjsDefault,
  formatIsoUtc,
  formatLocalIso,
  formatRfc9557,
  formatUtcString,
  parseIsoInstant,
  parseUnixMilliseconds,
  parseUnixSeconds,
  parseZonedDateTime,
} from '@/lib/time';
import {useTheme, type ThemePreference} from '@/lib/theme';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import {Field, FieldLabel} from '@/components/ui/field';
import {Label} from '@/components/ui/label';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Skeleton} from '@/components/ui/skeleton';
import {Switch} from '@/components/ui/switch';
import {CopyButton} from '@/components/copy-button';
import {DateTimeEditor, useCommitInstant} from '@/components/date-time-editor';
import {FormatActions, FormatSection} from '@/components/format-section';
import {RepresentationField} from '@/components/representation-field';
import {TimezoneCard} from '@/components/timezone-card';
import {TimezonePicker} from '@/components/timezone-picker';

// Below the fold or behind a click: loaded on demand.
const FormatGuide = lazy(() => import('@/components/format-guide'));
const IntlSection = lazy(() =>
  import('@/components/intl-section').then((m) => ({default: m.IntlSection})),
);

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

const THEMES: [ThemePreference, string, typeof SunIcon][] = [
  ['light', 'Light', SunIcon],
  ['dark', 'Dark', MoonIcon],
  ['system', 'System', MonitorIcon],
];

const NAV: [href: string, label: string][] = [
  ['#convert', 'Convert'],
  ['#timezones', 'Timezones'],
  ['#custom-format', 'Custom format'],
  ['#localized', 'Intl'],
];

function ThemeControl() {
  const {preference, setPreference} = useTheme();
  const [, label, Icon] = THEMES.find(([value]) => value === preference)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" aria-label={`Theme: ${label}`} />}
      >
        <Icon data-icon="inline-start" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={preference}
            onValueChange={(value) => setPreference(value as ThemePreference)}
          >
            {THEMES.map(([value, name, ItemIcon]) => (
              <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                <ItemIcon />
                {name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShareButton() {
  const {state} = useStore();
  return (
    <Button
      variant="outline"
      aria-label="Copy a link to this exact state"
      onClick={async () => {
        const url = shareUrl(state);
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Link copied', {
            description: state.live
              ? 'It opens in live mode, following the clock.'
              : 'It opens this exact instant, zones and formats.',
          });
        } catch {
          toast.error('Could not copy the link', {
            description: 'The address bar always holds the shareable link.',
          });
        }
      }}
    >
      <Share2Icon data-icon="inline-start" />
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
}

function Header({onOpenGuide}: {onOpenGuide: () => void}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-1 px-4 sm:gap-2 sm:px-6">
        <a
          href="#top"
          className="mr-2 flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight text-brand-text sm:mr-6"
        >
          <ClockIcon
            className="size-7 text-brand"
            strokeWidth={2.25}
            aria-hidden
          />
          DateConvert
        </a>
        <nav
          aria-label="Sections"
          className="mr-auto hidden items-center gap-1 md:flex"
        >
          {NAV.map(([href, label]) => (
            <Button key={href} variant="ghost" render={<a href={href} />}>
              {label}
            </Button>
          ))}
          <Button variant="ghost" onClick={onOpenGuide}>
            Format guide
          </Button>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Format guide"
            onClick={onOpenGuide}
          >
            <BookOpenIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="DateConvert on GitHub"
            render={
              <a
                href="https://github.com/xantiagoma/dateconvert"
                target="_blank"
                rel="noreferrer noopener"
              />
            }
          >
            <GithubIcon />
          </Button>
          <ShareButton />
          <ThemeControl />
        </div>
      </div>
    </header>
  );
}

function Representations() {
  const {state} = useStore();
  const commit = useCommitInstant();
  const extraMs = ((state.instant.epochMilliseconds % 1000) + 1000) % 1000;
  return (
    <div className="flex flex-col gap-4">
      <RepresentationField
        inline
        label="Unix seconds"
        value={epochSeconds(state.instant)}
        parse={parseUnixSeconds}
        onCommit={commit}
        inputMode="decimal"
        description={
          extraMs
            ? `+${extraMs} ms, kept in the other fields. Up to 3 decimals accepted.`
            : undefined
        }
      />
      <RepresentationField
        inline
        label="Unix milliseconds"
        value={epochMilliseconds(state.instant)}
        parse={parseUnixMilliseconds}
        onCommit={commit}
        inputMode="numeric"
      />
      <RepresentationField
        inline
        label="ISO 8601 (UTC)"
        value={formatIsoUtc(state.instant)}
        parse={parseIsoInstant}
        onCommit={commit}
        description="Needs Z or an offset; any offset is converted."
      />
      <p className="text-right text-xs text-muted-foreground">
        Valid changes update every field automatically.
      </p>
    </div>
  );
}

function ReadOnlyFormat({label, value}: {label: string; value: string}) {
  return (
    <Field className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-start gap-2">
        <output className="min-h-11 min-w-0 flex-1 rounded-lg border bg-card px-3 py-2.5 font-mono text-sm break-all tabular">
          {value}
        </output>
        <CopyButton value={value} label={label} />
      </div>
    </Field>
  );
}

function MoreFormats() {
  const {state, source} = useStore();
  const commit = useCommitInstant();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReadOnlyFormat
        label="UTC date (RFC 7231)"
        value={formatUtcString(state.instant)}
      />
      <ReadOnlyFormat
        label="Day.js default format (source)"
        value={formatDayjsDefault(state.instant, state.sourceZone)}
      />
      <ReadOnlyFormat
        label="ISO 8601 local with milliseconds (source)"
        value={formatLocalIso(source)}
      />
      <RepresentationField
        label="RFC 9557 with timezone"
        value={formatRfc9557(source)}
        parse={parseZonedDateTime}
        onCommit={commit}
        description="Editable. The bracketed zone reads the time; the source zone stays."
      />
    </div>
  );
}

function AddTimezone() {
  const {state, dispatch} = useStore();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" size="lg" className="h-10 bg-card" />}
      >
        <PlusIcon data-icon="inline-start" />
        Add timezone
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(26rem,calc(100vw-2rem))] p-0"
      >
        <TimezonePicker
          instant={state.instant}
          selected={state.zones}
          onSelect={(zone) => {
            dispatch({type: 'addZone', zone});
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function AcrossTimezones() {
  const {state, dispatch, h12} = useStore();
  return (
    <section
      id="timezones"
      aria-labelledby="timezones-title"
      className="flex scroll-mt-20 flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="timezones-title"
          className="font-serif text-3xl font-semibold tracking-tight"
        >
          Across timezones
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="details">Details</Label>
            <Switch
              id="details"
              checked={state.showDetails}
              onCheckedChange={(value) =>
                dispatch({type: 'setShowDetails', value})
              }
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => dispatch({type: 'resetZones'})}
            aria-label="Reset timezones to the defaults"
          >
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
          <AddTimezone />
        </div>
      </div>
      {state.zones.length ? (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {state.zones.map((zone) => (
            <TimezoneCard
              key={zone}
              zone={zone}
              epochNs={state.instant.epochNanoseconds}
              isSource={zone === state.sourceZone}
              showDetails={state.showDetails}
              h12={h12}
              dispatch={dispatch}
            />
          ))}
        </div>
      ) : (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>No timezones to compare</EmptyTitle>
            <EmptyDescription>
              The source timezone ({state.sourceZone}) is still set. Add any
              zone, or reset to the defaults.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            <AddTimezone />
            <Button
              variant="ghost"
              onClick={() => dispatch({type: 'resetZones'})}
            >
              <RotateCcwIcon data-icon="inline-start" />
              Reset
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
}

function Section({
  id,
  title,
  description,
  actions,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      render={
        <section
          id={id}
          aria-labelledby={`${id}-title`}
          className="scroll-mt-20"
        />
      }
    >
      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="group flex min-w-0 items-baseline gap-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            }
          >
            <ChevronDownIcon
              className="size-5 shrink-0 self-center transition-transform group-data-[panel-open]:rotate-0 -rotate-90"
              aria-hidden
            />
            <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <span
                id={`${id}-title`}
                className="font-serif text-2xl font-semibold tracking-tight"
              >
                {title}
              </span>
              <span className="text-sm text-muted-foreground">
                {description}
              </span>
            </span>
          </CollapsibleTrigger>
          {actions}
        </div>
        <CollapsibleContent>
          <div className="border-t px-5 py-5 sm:px-6">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function SectionFallback() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function App() {
  const {dispatch, state} = useStore();
  const [guideOpen, setGuideOpen] = useState(false);
  const openGuide = () => setGuideOpen(true);
  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Header onOpenGuide={openGuide} />
      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-[2.6rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-[3.4rem]">
            One moment. Every format.
          </h1>
          <p className="font-serif text-xl text-muted-foreground sm:text-2xl">
            Edit any value. Everything stays in sync.
          </p>
        </div>

        <Card id="convert" className="scroll-mt-20 py-0">
          <CardContent className="grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-2 lg:gap-0 lg:divide-x">
            <section
              aria-labelledby="local"
              className="flex min-w-0 flex-col gap-5 lg:pr-8"
            >
              <h2
                id="local"
                className="font-serif text-2xl font-semibold tracking-tight"
              >
                Local date &amp; time
              </h2>
              <DateTimeEditor />
            </section>
            <section
              aria-labelledby="formats"
              className="flex min-w-0 flex-col gap-5 lg:pl-8"
            >
              <h2
                id="formats"
                className="font-serif text-2xl font-semibold tracking-tight"
              >
                Same instant, other formats
              </h2>
              <Representations />
            </section>
          </CardContent>
        </Card>

        <AcrossTimezones />

        <Section
          id="custom-format"
          title="Custom format"
          description="Build a pattern, then read or write the instant in it."
          actions={<FormatActions onOpenGuide={openGuide} />}
        >
          <FormatSection />
        </Section>

        <Section
          id="localized"
          title="Localized (Intl)"
          description="Styles, translations, calendars and relative time from the browser's Intl."
        >
          <Suspense fallback={<SectionFallback />}>
            <IntlSection />
          </Suspense>
        </Section>

        <Section
          id="more-formats"
          title="More formats"
          description="Secondary representations of the same instant."
          defaultOpen={false}
        >
          <MoreFormats />
        </Section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-muted-foreground sm:px-6">
          <span>Changes stay in sync across all formats and timezones.</span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => {
                dispatch({type: 'resetAll'});
                toast.success('Preferences reset', {
                  description:
                    'Zones, formats and Intl settings are back to the defaults.',
                });
              }}
            >
              Reset all preferences
            </button>
            <span>
              Built by{' '}
              <a
                className="underline underline-offset-4 hover:text-foreground"
                href="https://github.com/xantiagoma"
              >
                Santiago Montoya
              </a>
            </span>
          </div>
        </div>
      </footer>
      {guideOpen ? (
        <Suspense fallback={null}>
          <FormatGuide
            open={guideOpen}
            onOpenChange={setGuideOpen}
            syntax={state.syntax}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

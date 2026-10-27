import {useCallback} from 'react';
import {BookOpenIcon, ChevronDownIcon} from 'lucide-react';
import {formatCustom, parseCustom, type Syntax} from '@/lib/pattern';
import {useStore} from '@/lib/store';
import {PRESETS} from '@/lib/tokens';
import {cityName} from '@/lib/zones';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {ToggleGroup, ToggleGroupItem} from '@/components/ui/toggle-group';
import {useCommitInstant} from './date-time-editor';
import {PatternEditor} from './pattern-editor';
import {RepresentationField} from './representation-field';

const SYNTAXES: [Syntax, string, string][] = [
  ['dayjs', 'Day.js', 'Original DateConvert tokens (English)'],
  ['datefns', 'date-fns · tiempo', 'Temporal-native, localized via Intl'],
];

function ZonePreview({zone}: {zone: string}) {
  const {state} = useStore();
  const commit = useCommitInstant();
  const {instant, pattern, syntax, intl, sourceZone} = state;
  const parse = useCallback(
    (text: string) =>
      parseCustom(text, pattern, zone, instant, syntax, intl.locale),
    [pattern, zone, instant, syntax, intl.locale],
  );
  const city = cityName(zone);
  return (
    <RepresentationField
      label={zone === sourceZone ? `${city} (source)` : city}
      copyLabel={`${city} custom format`}
      value={formatCustom(instant, zone, pattern, syntax, intl.locale)}
      parse={parse}
      onCommit={commit}
    />
  );
}

export function FormatActions({onOpenGuide}: {onOpenGuide: () => void}) {
  const {state, dispatch} = useStore();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        value={[state.syntax]}
        onValueChange={(values: string[]) => {
          const next = values[0] as Syntax | undefined;
          if (next) dispatch({type: 'setSyntax', syntax: next});
        }}
        aria-label="Token syntax"
      >
        {SYNTAXES.map(([value, label, hint]) => (
          <ToggleGroupItem
            key={value}
            value={value}
            title={hint}
            className="px-3"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
          Presets
          <ChevronDownIcon data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Common patterns</DropdownMenuLabel>
            {PRESETS[state.syntax].map(([name, pattern]) => (
              <DropdownMenuItem
                key={name}
                onClick={() => dispatch({type: 'setPattern', pattern})}
                className="flex flex-col items-start gap-0.5"
              >
                <span>{name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {pattern}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="sm" onClick={onOpenGuide}>
        <BookOpenIcon data-icon="inline-start" />
        Guide
      </Button>
    </div>
  );
}

export function FormatSection() {
  const {state, dispatch} = useStore();
  const zones = [...new Set([state.sourceZone, ...state.zones])];
  return (
    <div className="flex flex-col gap-6">
      <PatternEditor
        pattern={state.pattern}
        syntax={state.syntax}
        instant={state.instant}
        timeZone={state.sourceZone}
        locale={state.syntax === 'dayjs' ? 'en-US' : state.intl.locale}
        onChange={(pattern) => dispatch({type: 'setPattern', pattern})}
      />
      <div className="flex flex-col gap-3">
        <div className="text-sm">
          <span className="font-medium">In each timezone.</span>{' '}
          <span className="text-muted-foreground">
            Edit any of these too: text written in the pattern is read back and
            must format to exactly the same text.
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {zones.map((zone) => (
            <ZonePreview key={zone} zone={zone} />
          ))}
        </div>
      </div>
    </div>
  );
}

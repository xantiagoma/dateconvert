import {useDeferredValue, useMemo, useState} from 'react';
import {Badge} from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {Temporal, formatOffset} from '@/lib/time';
import {cityName, searchZones, softInfo} from '@/lib/zones';

/**
 * Searchable list of zones: IANA names, cities and timezone-soft aliases or
 * abbreviations. Ambiguous aliases list every match; nothing is auto-picked.
 */
export function TimezonePicker({
  instant,
  onSelect,
  selected = [],
  current,
  placeholder = 'City, IANA name or abbreviation…',
}: {
  instant: Temporal.Instant;
  onSelect: (zone: string) => void;
  /** Zones already chosen (shown as "Added"). */
  selected?: string[];
  /** The zone this picker currently controls (shown as checked). */
  current?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  // Keep typing responsive; results can lag a frame behind.
  const deferredQuery = useDeferredValue(query);
  const matches = useMemo(() => searchZones(deferredQuery), [deferredQuery]);

  return (
    <Command shouldFilter={false} loop>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={placeholder}
        aria-label="Search timezones"
      />
      <CommandList className="max-h-80">
        <CommandEmpty>
          No timezone matches “{query}”. Try a city (Bogotá), an IANA name
          (Europe/London) or an abbreviation (CST).
        </CommandEmpty>
        <CommandGroup
          heading={
            query
              ? `${matches.length} result${matches.length === 1 ? '' : 's'}`
              : 'All timezones'
          }
        >
          {matches.map(({timeZone, supported, via}) => {
            const offset = supported
              ? formatOffset(instant.toZonedDateTimeISO(timeZone).offset)
              : null;
            const names = softInfo(timeZone)[0];
            const abbrs = [names?.standard?.abbr, names?.daylight?.abbr]
              .filter(Boolean)
              .join(' / ');
            const added = selected.includes(timeZone);
            return (
              <CommandItem
                key={timeZone}
                value={timeZone}
                disabled={!supported}
                data-checked={current === timeZone ? true : undefined}
                onSelect={() => onSelect(timeZone)}
                className="items-start py-2"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {cityName(timeZone)}
                    </span>
                    {added && <Badge variant="secondary">Added</Badge>}
                    {!supported && (
                      <Badge variant="outline">Not supported</Badge>
                    )}
                  </div>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {timeZone}
                    {abbrs && ` · ${abbrs}`}
                  </span>
                  {via && (
                    <span className="truncate text-xs text-muted-foreground">
                      Matched {via}
                    </span>
                  )}
                </div>
                {offset && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular">
                    {offset}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

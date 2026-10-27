import {useLayoutEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {Temporal} from '@/lib/time';
import {cn} from '@/lib/utils';

const pad = (value: number) => String(value).padStart(2, '0');
const range = (length: number, from = 0) =>
  Array.from({length}, (_, i) => i + from);

const HOURS_24 = range(24);
const HOURS_12 = [12, ...range(11, 1)];
const SIXTY = range(60);

function Column({
  label,
  values,
  selected,
  format = pad,
  onSelect,
}: {
  label: string;
  values: number[];
  selected: number;
  format?: (value: number) => string;
  onSelect: (value: number) => void;
}) {
  const list = useRef<HTMLDivElement>(null);

  // Keep the selected value in view (DOM sync, not state).
  useLayoutEffect(() => {
    const element = list.current?.querySelector<HTMLElement>(
      '[aria-selected=true]',
    );
    element?.scrollIntoView({block: 'center'});
  }, [selected]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="text-center text-xs text-muted-foreground">{label}</div>
      <div
        ref={list}
        role="listbox"
        aria-label={label}
        className="flex h-56 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-md border bg-background p-1 [scrollbar-width:thin]"
      >
        {values.map((value) => (
          <Button
            key={value}
            role="option"
            aria-selected={value === selected}
            variant={value === selected ? 'default' : 'ghost'}
            size="sm"
            className="shrink-0 font-mono tabular"
            onClick={() => onSelect(value)}
          >
            {format(value)}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Pick hours, minutes and seconds by column; milliseconds are kept. */
export function TimePicker({
  value,
  h12,
  onChange,
  onNow,
}: {
  value: Temporal.PlainTime;
  h12: boolean;
  onChange: (time: Temporal.PlainTime) => void;
  onNow: () => void;
}) {
  const pm = value.hour >= 12;
  const set = (fields: Partial<Temporal.PlainTimeLike>) =>
    onChange(value.with(fields));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {h12 ? (
          <Column
            label="Hour"
            values={HOURS_12}
            selected={value.hour % 12 || 12}
            format={String}
            onSelect={(hour) => set({hour: (hour % 12) + (pm ? 12 : 0)})}
          />
        ) : (
          <Column
            label="Hour"
            values={HOURS_24}
            selected={value.hour}
            onSelect={(hour) => set({hour})}
          />
        )}
        <Column
          label="Min"
          values={SIXTY}
          selected={value.minute}
          onSelect={(minute) => set({minute})}
        />
        <Column
          label="Sec"
          values={SIXTY}
          selected={value.second}
          onSelect={(second) => set({second})}
        />
        {h12 ? (
          <div className="flex flex-col gap-1">
            <div className="text-center text-xs text-muted-foreground">
              &nbsp;
            </div>
            <div
              role="radiogroup"
              aria-label="AM or PM"
              className="flex flex-col gap-0.5"
            >
              {(['AM', 'PM'] as const).map((meridiem) => {
                const active = (meridiem === 'PM') === pm;
                return (
                  <Button
                    key={meridiem}
                    role="radio"
                    aria-checked={active}
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    className={cn('font-mono')}
                    onClick={() =>
                      set({
                        hour: (value.hour % 12) + (meridiem === 'PM' ? 12 : 0),
                      })
                    }
                  >
                    {meridiem}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      <Separator />
      <div className="grid grid-cols-3 gap-1.5">
        <Button variant="outline" size="sm" onClick={onNow}>
          Now
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Temporal.PlainTime.from('00:00'))}
        >
          {h12 ? '12 AM' : '00:00'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Temporal.PlainTime.from('12:00'))}
        >
          {h12 ? '12 PM' : '12:00'}
        </Button>
      </div>
    </div>
  );
}

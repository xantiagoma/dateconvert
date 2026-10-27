import {
  getWeekdays,
  useCalendarView,
  useCreateCalendar,
} from '@gobrand/react-calendar';
import {ChevronLeftIcon, ChevronRightIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Temporal} from '@/lib/time';
import {cn} from '@/lib/utils';

const MONTHS = Array.from({length: 12}, (_, i) => ({
  value: String(i + 1),
  label: new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
  }).format(Date.UTC(2026, i, 15)),
}));
const WEEKDAYS = getWeekdays(7, 'en-US', 'short');

/** Month grid built on @gobrand/react-calendar (Temporal-native). */
export function MonthCalendar({
  value,
  onSelect,
  timeZone,
}: {
  value: Temporal.PlainDate;
  onSelect: (date: Temporal.PlainDate) => void;
  timeZone: string;
}) {
  const calendar = useCreateCalendar({
    views: {month: true},
    defaultDate: value,
    timeZone,
    weekStartsOn: 7,
  });
  const month = useCalendarView({view: 'month', calendar});
  const shown = month.month;

  const jump = (fields: {year?: number; month?: number}) =>
    calendar.setDate(
      Temporal.PlainDate.from(
        {
          year: fields.year ?? shown.year,
          month: fields.month ?? shown.month,
          day: 1,
        },
        {overflow: 'constrain'},
      ),
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={calendar.previous}
        >
          <ChevronLeftIcon />
        </Button>
        <Select
          items={MONTHS}
          value={String(shown.month)}
          onValueChange={(next) => jump({month: Number(next)})}
        >
          <SelectTrigger size="sm" className="flex-1" aria-label="Month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {MONTHS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          type="number"
          aria-label="Year"
          className="h-7 w-[4.75rem] font-mono tabular"
          value={shown.year}
          onChange={(event) => {
            const year = Number(event.target.value);
            if (Number.isInteger(year) && year >= -271820 && year <= 275759)
              jump({year});
          }}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          onClick={calendar.next}
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <table className="w-full border-collapse text-center text-sm" role="grid">
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th
                key={day}
                scope="col"
                className="pb-1 text-xs font-normal text-muted-foreground"
              >
                {day.slice(0, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {month.weeks.map((week) => (
            <tr key={week[0]!.id}>
              {week.map((day) => {
                const selected = day.date.equals(value);
                return (
                  <td key={day.id} className="p-0.5">
                    <Button
                      variant={
                        selected ? 'default' : day.isToday ? 'outline' : 'ghost'
                      }
                      size="icon-sm"
                      aria-pressed={selected}
                      aria-label={day.date.toLocaleString('en-US', {
                        dateStyle: 'full',
                      })}
                      className={cn(
                        'w-full font-mono tabular',
                        !day.isCurrentMonth &&
                          !selected &&
                          'text-muted-foreground/60',
                      )}
                      onClick={() => onSelect(day.date)}
                    >
                      {day.date.day}
                    </Button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          calendar.today();
          onSelect(Temporal.Now.plainDateISO(timeZone));
        }}
      >
        Today in this zone
      </Button>
    </div>
  );
}

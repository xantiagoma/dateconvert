import {Temporal} from './time';

/** A steppable part of a date or time field: a number run or AM/PM. */
export type Segment = {start: number; end: number; kind: SegmentKind};
export type SegmentKind =
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond'
  | 'meridiem';

const DATE_KINDS: SegmentKind[] = ['year', 'month', 'day'];
const TIME_KINDS: SegmentKind[] = ['hour', 'minute', 'second', 'millisecond'];
const RUN = /[+-]?\d+|[ap]\.?\s?m\.?/gi;

export function segments(text: string, field: 'date' | 'time'): Segment[] {
  const kinds = field === 'date' ? DATE_KINDS : TIME_KINDS;
  const result: Segment[] = [];
  let number = 0;
  for (const match of text.matchAll(RUN)) {
    const start = match.index!;
    const isMeridiem = /[ap]/i.test(match[0]);
    // A leading sign only belongs to the year.
    const signed =
      /^[+-]/.test(match[0]) && !(field === 'date' && number === 0);
    const kind = isMeridiem ? 'meridiem' : kinds[number++];
    if (!kind) continue;
    result.push({
      start: signed ? start + 1 : start,
      end: start + match[0].length,
      kind,
    });
  }
  return result;
}

/** The segment under the caret, or the closest one before it. */
export function segmentAt(text: string, field: 'date' | 'time', caret: number) {
  const parts = segments(text, field);
  return (
    parts.find((part) => caret >= part.start && caret <= part.end) ??
    parts.filter((part) => part.start <= caret).pop() ??
    parts[0]
  );
}

/** Move the instant one unit of `kind` in its zone (calendar-aware). */
export function step(
  zdt: Temporal.ZonedDateTime,
  kind: SegmentKind,
  delta: 1 | -1,
): Temporal.ZonedDateTime {
  if (kind === 'meridiem') return zdt.add({hours: 12 * delta});
  const unit = `${kind}s` as const;
  return zdt.add({[unit]: delta});
}

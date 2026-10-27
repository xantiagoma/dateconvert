import {useId, type ReactNode} from 'react';
import {useDraftField} from '@/hooks/use-draft-field';
import type {ParseResult} from '@/lib/time';
import {cn} from '@/lib/utils';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {CopyButton} from './copy-button';

/**
 * One editable representation of the instant. Valid edits sync everything
 * immediately; invalid drafts stay local to the field.
 */
export function RepresentationField({
  label,
  copyLabel = label,
  value,
  parse,
  onCommit,
  description,
  placeholder,
  inputMode,
  inline = false,
  hideLabel = false,
}: {
  label: string;
  copyLabel?: string;
  value: string;
  parse: (text: string) => ParseResult;
  onCommit: (result: Extract<ParseResult, {ok: true}>) => void;
  description?: ReactNode;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  /** Label beside the input from `sm` up. */
  inline?: boolean;
  hideLabel?: boolean;
}) {
  const id = useId();
  const field = useDraftField({value, parse, onCommit});
  const helpId = `${id}-help`;
  const note = field.error ? (
    <FieldError id={helpId} className={cn(inline && 'sm:col-start-2')}>
      {field.error}{' '}
      <span className="text-muted-foreground">
        Esc restores the last value.
      </span>
    </FieldError>
  ) : field.pending ? (
    <FieldDescription
      id={helpId}
      className={cn('text-xs', inline && 'sm:col-start-2')}
    >
      Not applied yet. Everything else still shows the last valid instant.
    </FieldDescription>
  ) : description ? (
    <FieldDescription
      id={helpId}
      className={cn('text-xs', inline && 'sm:col-start-2')}
    >
      {description}
    </FieldDescription>
  ) : null;

  return (
    <Field
      data-invalid={field.error ? true : undefined}
      className={cn(
        'min-w-0',
        inline &&
          'sm:grid sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4',
      )}
    >
      <FieldLabel htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </FieldLabel>
      <div className="flex min-w-0 items-center gap-2">
        <Input
          id={id}
          {...field.inputProps}
          className="h-11 min-w-0 flex-1 bg-card font-mono text-base tabular"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          inputMode={inputMode}
          placeholder={placeholder}
          aria-describedby={note ? helpId : undefined}
        />
        <CopyButton value={value} label={copyLabel} />
      </div>
      {note}
    </Field>
  );
}

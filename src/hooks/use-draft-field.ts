import {useState} from 'react';
import type {ParseResult} from '@/lib/time';

type Draft = {
  text: string;
  error: string | null;
  /** The committed value when the field was last left; a different value
   *  means another field changed the instant, which discards this draft. */
  base: string | null;
};

/**
 * Text-field editing contract for synced representations:
 * - the literal draft is kept while typing (no normalization, caret stays);
 * - a valid draft commits immediately; an invalid one never touches the instant;
 * - errors appear on Enter/blur, not on every keystroke;
 * - Enter or blur normalizes a valid draft; Escape restores the last valid value;
 * - an invalid draft survives blur until the user fixes it, presses Escape, or
 *   another field commits a new instant.
 */
export function useDraftField({
  value,
  parse,
  onCommit,
  onRejected,
}: {
  value: string;
  parse: (text: string) => ParseResult;
  onCommit: (result: Extract<ParseResult, {ok: true}>) => void;
  onRejected?: (result: Extract<ParseResult, {ok: false}>) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [focused, setFocused] = useState(false);

  // Derived reset (no effect): a stale draft yields to a newer instant.
  if (draft && !focused && draft.base !== null && draft.base !== value) {
    setDraft(null);
  }

  function settle(text: string | undefined) {
    if (text === undefined) return true;
    const result = parse(text);
    if (result.ok) {
      setDraft(null);
      return true;
    }
    setDraft({text, error: result.message, base: value});
    onRejected?.(result);
    return false;
  }

  function edit(text: string) {
    setDraft({text, error: null, base: null});
    const result = parse(text);
    if (result.ok) onCommit(result);
  }

  const pending =
    draft !== null && draft.error === null && !parse(draft.text).ok;

  return {
    text: draft?.text ?? value,
    error: draft?.error ?? null,
    /** Draft not yet valid; the rest of the app still shows the last instant. */
    pending,
    /** Drop the draft (e.g. after a programmatic change while focused). */
    reset: () => setDraft(null),
    /** Replace the text as if typed (used by pickers and segment stepping). */
    edit,
    inputProps: {
      value: draft?.text ?? value,
      'aria-invalid': draft?.error ? true : undefined,
      onFocus: () => setFocused(true),
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        edit(event.target.value),
      onBlur: () => {
        setFocused(false);
        settle(draft?.text);
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          settle(draft?.text);
        } else if (event.key === 'Escape' && draft !== null) {
          event.preventDefault();
          event.stopPropagation();
          setDraft(null);
        }
      },
    },
  };
}

import {useId, useRef, useState} from 'react';
import {GripVerticalIcon, XIcon} from 'lucide-react';
import {tokenize, formatCustom, type Syntax} from '@/lib/pattern';
import {
  TOKEN_DOCS,
  TOKEN_GROUPS,
  suggestTokens,
  tokenDoc,
  type TokenDoc,
} from '@/lib/tokens';
import {Temporal} from '@/lib/time';
import {cn} from '@/lib/utils';
import {Badge} from '@/components/ui/badge';
import {Field, FieldDescription, FieldLabel} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';

type Example = (token: string) => string;

/** The token-letter run ending at the caret, outside literals. */
function wordAtCaret(pattern: string, caret: number, syntax: Syntax) {
  const before = pattern.slice(0, caret);
  const open = syntax === 'dayjs' ? '[' : "'";
  const close = syntax === 'dayjs' ? ']' : "'";
  const inLiteral =
    syntax === 'dayjs'
      ? before.lastIndexOf(open) > before.lastIndexOf(close)
      : (before.match(/'/g)?.length ?? 0) % 2 === 1;
  if (inLiteral) return null;
  const match = /[A-Za-z]+$/.exec(before);
  return match ? {word: match[0], start: caret - match[0].length} : null;
}

const DRAG_TYPE = 'application/x-dateconvert-token';

function SuggestionList({
  id,
  items,
  active,
  example,
  onPick,
}: {
  id: string;
  items: TokenDoc[];
  active: number;
  example: Example;
  onPick: (doc: TokenDoc) => void;
}) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Token suggestions"
      className="absolute top-full right-0 left-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {items.map((doc, index) => (
        <li
          key={doc.token}
          id={`${id}-${index}`}
          role="option"
          aria-selected={index === active}
          // Keep focus in the input while choosing.
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(doc);
          }}
          className={cn(
            'flex cursor-default items-center gap-3 rounded-md px-2 py-1.5 text-sm',
            index === active && 'bg-muted',
          )}
        >
          <code className="w-14 shrink-0 font-mono font-medium text-brand-text">
            {doc.token}
          </code>
          <span className="min-w-0 flex-1 truncate">{doc.description}</span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {example(doc.token)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PatternChip({
  text,
  isToken,
  doc,
  example,
  dragging,
  onDragStart,
  onDropBefore,
  onMove,
  onRemove,
}: {
  text: string;
  isToken: boolean;
  doc?: TokenDoc;
  example: string;
  dragging: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDropBefore: (event: React.DragEvent) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [over, setOver] = useState(false);
  const label = isToken
    ? `${text}: ${doc?.description ?? 'token'}, shows ${example}`
    : `Literal “${text}”`;
  return (
    <li
      draggable
      tabIndex={0}
      aria-label={`${label}. Alt + arrow keys to move, Delete to remove.`}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        onDropBefore(event);
      }}
      onKeyDown={(event) => {
        if (
          event.altKey &&
          (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
        ) {
          event.preventDefault();
          onMove(event.key === 'ArrowLeft' ? -1 : 1);
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          onRemove();
        }
      }}
      className={cn(
        'group flex h-8 cursor-grab items-center gap-1 rounded-md border pr-1 pl-1 font-mono text-sm whitespace-pre transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing',
        isToken
          ? 'border-brand/40 bg-brand-soft text-foreground'
          : 'border-dashed bg-background text-muted-foreground',
        over && 'border-l-4 border-l-brand',
        dragging && 'opacity-40',
      )}
    >
      <GripVerticalIcon
        className="size-3.5 text-muted-foreground"
        aria-hidden
      />
      {isToken ? (
        <Tooltip>
          <TooltipTrigger render={<span />}>{text}</TooltipTrigger>
          <TooltipContent>
            {doc?.description ?? 'Token'} →{' '}
            <span className="font-mono">{example}</span>
          </TooltipContent>
        </Tooltip>
      ) : (
        <span>{text.replace(/ /g, '·')}</span>
      )}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onRemove}
        className="rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>
    </li>
  );
}

function TokenPalette({
  syntax,
  example,
  onInsert,
}: {
  syntax: Syntax;
  example: Example;
  onInsert: (token: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium">
        Tokens{' '}
        <span className="font-normal text-muted-foreground">
          (click to insert at the cursor, or drag onto the pieces)
        </span>
      </div>
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        {TOKEN_GROUPS.map((group) => {
          const docs = TOKEN_DOCS[syntax].filter((doc) => doc.group === group);
          return docs.length ? (
            <div key={group} className="flex flex-col gap-1">
              <div className="text-xs text-muted-foreground">{group}</div>
              <div className="flex flex-wrap gap-1">
                {docs.map((doc) => (
                  <Tooltip key={doc.token}>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData(DRAG_TYPE, doc.token);
                            event.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => onInsert(doc.token)}
                          className="h-7 cursor-grab rounded-md border bg-background px-2 font-mono text-xs transition-colors hover:border-brand hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        />
                      }
                    >
                      {doc.token}
                    </TooltipTrigger>
                    <TooltipContent>
                      {doc.description}
                      {/^[[']/.test(doc.token) ? null : (
                        <>
                          {' '}
                          →{' '}
                          <span className="font-mono">
                            {example(doc.token)}
                          </span>
                        </>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}

/**
 * Pattern input with token autocomplete, a draggable view of its pieces and a
 * token palette. Everything edits the same pattern string.
 */
export function PatternEditor({
  pattern,
  syntax,
  instant,
  timeZone,
  locale,
  onChange,
}: {
  pattern: string;
  syntax: Syntax;
  instant: Temporal.Instant;
  timeZone: string;
  locale: string;
  onChange: (pattern: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const example: Example = (token) =>
    formatCustom(instant, timeZone, token, syntax, locale);
  const parts = tokenize(pattern, syntax);
  const word = caret === null ? null : wordAtCaret(pattern, caret, syntax);
  const suggestions =
    word && !dismissed ? suggestTokens(syntax, word.word) : [];
  const open = suggestions.length > 0;
  const activeIndex = Math.min(active, Math.max(suggestions.length - 1, 0));

  const setPattern = (next: string, nextCaret: number) => {
    onChange(next);
    setCaret(nextCaret);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const accept = (doc: TokenDoc) => {
    if (!word) return;
    const next =
      pattern.slice(0, word.start) + doc.token + pattern.slice(caret!);
    setDismissed(true);
    setPattern(next, word.start + doc.token.length);
  };

  const insert = (token: string, at = caret ?? pattern.length) => {
    const next = pattern.slice(0, at) + token + pattern.slice(at);
    setPattern(next, at + token.length);
  };

  const rebuild = (texts: string[]) => onChange(texts.join(''));

  const moveChip = (from: number, to: number) => {
    const texts = parts.map((part) => part.text);
    const [moved] = texts.splice(from, 1);
    texts.splice(to > from ? to - 1 : to, 0, moved!);
    rebuild(texts);
  };

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={id}>Format pattern</FieldLabel>
        <div className="relative">
          <Input
            ref={input}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? `${id}-list` : undefined}
            aria-activedescendant={
              open ? `${id}-list-${activeIndex}` : undefined
            }
            aria-autocomplete="list"
            value={pattern}
            onChange={(event) => {
              onChange(event.target.value);
              setCaret(event.target.selectionStart);
              setActive(0);
              setDismissed(false);
            }}
            onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
            onBlur={() => setCaret(null)}
            onKeyDown={(event) => {
              if (!open) return;
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const delta = event.key === 'ArrowDown' ? 1 : -1;
                setActive(
                  (activeIndex + delta + suggestions.length) %
                    suggestions.length,
                );
              } else if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                accept(suggestions[activeIndex]!);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                setDismissed(true);
              }
            }}
            className="h-11 bg-card font-mono text-base"
            spellCheck={false}
            autoComplete="off"
          />
          {open ? (
            <SuggestionList
              id={`${id}-list`}
              items={suggestions}
              active={activeIndex}
              example={example}
              onPick={accept}
            />
          ) : null}
        </div>
        <FieldDescription className="text-xs">
          Start typing a token (e.g. <code className="font-mono">M</code>) for
          suggestions. ↑ ↓ to choose, Enter or Tab to insert.
        </FieldDescription>
      </Field>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">
          Pieces{' '}
          <span className="font-normal text-muted-foreground">
            (drag to reorder; Alt + ← → on a focused piece)
          </span>
        </div>
        <ol
          aria-label="Pattern pieces"
          className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-dashed p-1.5"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            const token = event.dataTransfer.getData(DRAG_TYPE);
            if (token) insert(token, pattern.length);
            else if (dragIndex !== null) moveChip(dragIndex, parts.length);
            setDragIndex(null);
          }}
        >
          {parts.length ? (
            parts.map((part, index) => (
              <PatternChip
                key={`${part.start}-${part.text}`}
                text={part.text}
                isToken={part.kind === 'token'}
                doc={tokenDoc(syntax, part.text)}
                example={part.kind === 'token' ? example(part.text) : ''}
                dragging={dragIndex === index}
                onDragStart={(event) => {
                  setDragIndex(index);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', part.text);
                }}
                onDropBefore={(event) => {
                  event.stopPropagation();
                  const token = event.dataTransfer.getData(DRAG_TYPE);
                  if (token) insert(token, part.start);
                  else if (dragIndex !== null) moveChip(dragIndex, index);
                  setDragIndex(null);
                }}
                onMove={(delta) => {
                  const to = index + delta;
                  if (to < 0 || to >= parts.length) return;
                  moveChip(index, delta > 0 ? to + 1 : to);
                }}
                onRemove={() =>
                  rebuild(
                    parts.filter((_, i) => i !== index).map((p) => p.text),
                  )
                }
              />
            ))
          ) : (
            <li className="px-2 text-sm text-muted-foreground">
              Drop tokens here.
            </li>
          )}
        </ol>
      </div>

      <TokenPalette
        syntax={syntax}
        example={example}
        onInsert={(token) => insert(token)}
      />
      {syntax === 'dayjs' ? null : (
        <Badge variant="secondary" className="self-start">
          Names follow the Intl locale ({locale})
        </Badge>
      )}
    </div>
  );
}

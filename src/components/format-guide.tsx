import {ExternalLinkIcon} from 'lucide-react';
import type {Syntax} from '@/lib/pattern';
import {TOKEN_DOCS, TOKEN_GROUPS} from '@/lib/tokens';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';

const SOURCES: Record<Syntax, {name: string; intro: string; href: string}> = {
  dayjs: {
    name: 'Day.js',
    intro:
      'The original DateConvert syntax: Day.js tokens with the utc, timezone, advancedFormat and localizedFormat plugins. English names. Wrap literal text in [brackets].',
    href: 'https://day.js.org/docs/en/display/format',
  },
  datefns: {
    name: 'date-fns · tiempo',
    intro:
      "date-fns tokens rendered by @gobrand/tiempo directly on Temporal. Month, weekday, AM/PM and zone names follow the Intl locale. Wrap literal text in 'single quotes'.",
    href: 'https://tiempo.gobrand.app/',
  },
};

function TokenTable({syntax}: {syntax: Syntax}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {TOKEN_GROUPS.map((group) => {
        const docs = TOKEN_DOCS[syntax].filter((doc) => doc.group === group);
        return docs.length ? (
          <section key={group} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{group}</h3>
            <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 text-sm">
              {docs.map((doc) => (
                <div key={doc.token} className="contents">
                  <dt className="font-mono text-brand-text">{doc.token}</dt>
                  <dd className="text-muted-foreground">{doc.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null;
      })}
    </div>
  );
}

export default function FormatGuide({
  open,
  onOpenChange,
  syntax,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syntax: Syntax;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Format guide</DialogTitle>
          <DialogDescription>
            Tokens are case-sensitive: M is month, m is minute. Both syntaxes
            can be typed into the previews and read back.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={syntax}>
          <TabsList>
            {(Object.keys(SOURCES) as Syntax[]).map((key) => (
              <TabsTrigger key={key} value={key}>
                {SOURCES[key].name}
              </TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(SOURCES) as Syntax[]).map((key) => (
            <TabsContent
              key={key}
              value={key}
              className="flex flex-col gap-4 pt-3"
            >
              <p className="text-sm text-muted-foreground">
                {SOURCES[key].intro}
              </p>
              <TokenTable syntax={key} />
              <Button
                variant="outline"
                className="self-start"
                render={
                  <a
                    href={SOURCES[key].href}
                    target="_blank"
                    rel="noreferrer noopener"
                  />
                }
              >
                Full {SOURCES[key].name} reference
                <ExternalLinkIcon data-icon="inline-end" />
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

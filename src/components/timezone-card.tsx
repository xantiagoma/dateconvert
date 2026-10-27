import {memo} from 'react';
import {MoonIcon, PinIcon, SunIcon, XIcon} from 'lucide-react';
import type {Action} from '@/lib/store';
import {
  Temporal,
  dstInfo,
  formatLocalIso,
  formatOffset,
  formatPlainTime,
  friendlyDate,
  hemisphere,
  isApproxDaytime,
  shortZoneName,
} from '@/lib/time';
import {cityName, softInfo, type ZoneName} from '@/lib/zones';
import {cn} from '@/lib/utils';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import {CopyButton} from './copy-button';

const formatSoftOffset = (hours: number) => {
  const sign = hours < 0 ? '-' : '+';
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return formatOffset(
    `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
  );
};

function Detail({term, children}: {term: string; children: React.ReactNode}) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-3">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function ZoneNameLine({name}: {name: ZoneName | null | undefined}) {
  return name?.name ? (
    <span>
      {name.abbr}{' '}
      <span className="font-mono text-xs text-muted-foreground">
        ({formatSoftOffset(name.offset)})
      </span>
    </span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

function IconAction({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={active || undefined}
            className={cn(active && 'text-brand')}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export const TimezoneCard = memo(function TimezoneCard({
  zone,
  epochNs,
  isSource,
  showDetails,
  h12,
  dispatch,
}: {
  zone: string;
  /** Primitive instant so memo can skip renders. */
  epochNs: bigint;
  isSource: boolean;
  showDetails: boolean;
  h12: boolean;
  dispatch: React.Dispatch<Action>;
}) {
  const zdt =
    Temporal.Instant.fromEpochNanoseconds(epochNs).toZonedDateTimeISO(zone);
  const dst = dstInfo(zdt);
  const soft = softInfo(zone)[0];
  const daytime = isApproxDaytime(zdt);
  const city = cityName(zone);
  const abbr = shortZoneName(zdt);
  const dstStatus = dst.isDst
    ? `Daylight time${soft?.daylight?.abbr ? ` (${soft.daylight.abbr})` : ''}`
    : dst.observesDst
      ? `Standard time${soft?.standard?.abbr ? ` (${soft.standard.abbr})` : ''}`
      : 'Not observed';

  return (
    <Card
      className={cn(
        'min-w-0 gap-4 transition-colors',
        isSource && 'border-brand ring-1 ring-brand',
      )}
      aria-label={`${city}${isSource ? ' (source)' : ''}`}
    >
      <CardHeader className="gap-0.5">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base font-semibold">
          <span
            className={cn(
              'shrink-0',
              daytime ? 'text-brand' : 'text-muted-foreground',
            )}
            title={
              daytime
                ? 'Daytime (approximate, by local hour)'
                : 'Night (approximate, by local hour)'
            }
          >
            {daytime ? (
              <SunIcon className="size-5" aria-hidden />
            ) : (
              <MoonIcon className="size-5" aria-hidden />
            )}
          </span>
          <span className="truncate">{city}</span>
          {isSource ? (
            <span className="shrink-0 text-sm font-normal text-brand-text">
              (source)
            </span>
          ) : null}
        </CardTitle>
        <CardDescription className="truncate pl-7 font-mono text-xs">
          {zone}
        </CardDescription>
        <CardAction className="flex">
          <IconAction
            label={isSource ? `${city} is the source` : `Use ${city} as source`}
            active={isSource}
            onClick={() => dispatch({type: 'setSourceZone', zone})}
          >
            <PinIcon className={cn(isSource && 'fill-current')} />
          </IconAction>
          <CopyButton
            value={formatLocalIso(zdt)}
            label={`${city} date and time`}
            size="icon-sm"
            variant="ghost"
          />
          <IconAction
            label={`Remove ${city}`}
            onClick={() => dispatch({type: 'removeZone', zone})}
          >
            <XIcon />
          </IconAction>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="font-mono text-[2.5rem] leading-none font-medium tracking-tight tabular">
            {formatPlainTime(zdt, h12).replace(/\.\d+/, '')}
            {zdt.millisecond ? (
              <span className="text-lg text-muted-foreground">
                .{String(zdt.millisecond).padStart(3, '0')}
              </span>
            ) : null}
          </div>
          <div className="font-mono text-sm">{friendlyDate(zdt)}</div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-sm text-muted-foreground tabular">
            {formatOffset(zdt.offset)}
            {abbr ? <span>· {abbr}</span> : null}
            {dst.isDst ? <Badge variant="outline">DST</Badge> : null}
          </div>
        </div>
        {showDetails ? (
          <>
            <Separator />
            <dl className="flex flex-col gap-1.5 text-sm">
              <Detail term="Daylight saving">{dstStatus}</Detail>
              <Detail term="Observes DST">
                {dst.observesDst ? `Yes, in ${zdt.year}` : 'No'}
              </Detail>
              <Detail term="Standard time">
                <ZoneNameLine name={soft?.standard} />
              </Detail>
              <Detail term="Daylight time">
                <ZoneNameLine name={soft?.daylight} />
              </Detail>
              <Detail term="Hemisphere">{hemisphere(zone)}</Detail>
              <div className="flex flex-col gap-0.5 pt-1">
                <dt className="text-muted-foreground">ISO (local)</dt>
                <dd className="font-mono text-xs break-all tabular">
                  {formatLocalIso(zdt)}
                </dd>
              </div>
            </dl>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
});

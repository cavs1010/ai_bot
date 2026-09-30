import { ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { Badge } from './badge';

export type StatTone = 'text' | 'positive' | 'danger';
export type StatMark = 'up' | 'down' | 'soon' | 'calm';
type StatLayout = 'stacked' | 'inline' | 'pair';

type StatProps = {
  label: string;
  value: string;
  fetching: boolean;
  layout: StatLayout;
  tone: StatTone;
  detail?: string;
  badge?: string;
  mark?: StatMark;
};

const toneClass: Record<StatTone, string> = {
  text: 'text-text',
  positive: 'text-positive',
  danger: 'text-danger',
};

function Updating({ layout }: { layout: StatLayout }) {
  const stacked = layout === 'stacked';
  return (
    <span className={`inline-flex items-center gap-1.5 text-accent font-mono animate-pulse ${stacked ? 'text-xs mt-0.5' : 'font-semibold'}`}>
      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      <span className={`${stacked ? 'text-[10px] font-sans font-medium' : 'text-[11px]'} text-text-muted`}>Updating...</span>
    </span>
  );
}

function Mark({ mark }: { mark: StatMark }) {
  if (mark === 'up') return <ArrowUpRight className="h-3 w-3" />;
  if (mark === 'down') return <ArrowDownRight className="h-3 w-3" />;
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${mark === 'soon' ? 'bg-warning animate-ping' : 'bg-positive'}`} />
  );
}

export function Stat({ label, value, fetching, layout, tone, detail, badge, mark }: StatProps) {
  const color = toneClass[tone];

  if (layout === 'pair') {
    return (
      <span className="flex items-center gap-1 font-mono">
        <span className="text-text font-semibold">{label}</span>
        <span className={`text-[10px] ${color}`}>{value}</span>
      </span>
    );
  }

  if (fetching) {
    return layout === 'stacked' ? (
      <div>
        <div className="text-[10px] text-text-faint font-sans">{label}</div>
        <Updating layout={layout} />
      </div>
    ) : (
      <span className="flex items-center gap-1.5">
        {mark === 'soon' || mark === 'calm' ? <Mark mark={mark} /> : null}
        <span className="text-text-faint font-medium">{label}</span>
        <Updating layout={layout} />
      </span>
    );
  }

  if (layout === 'stacked') {
    return (
      <div>
        <div className="text-[10px] text-text-faint font-sans">{label}</div>
        <div className={`font-bold font-mono ${color}`}>
          {value}
          {detail ? ` ${detail}` : ''}
          {badge ? <> <Badge kind="pnl-up">{badge}</Badge></> : null}
        </div>
      </div>
    );
  }

  const showArrow = mark === 'up' || mark === 'down';
  const showDot = mark === 'soon' || mark === 'calm';

  return (
    <span className="flex items-center gap-1.5">
      {showDot && mark ? <Mark mark={mark} /> : null}
      <span className="text-text-faint font-medium">{label}</span>
      <span className={`font-semibold font-mono flex items-center ${color}`}>
        {value}
        {showArrow && mark ? <Mark mark={mark} /> : null}
      </span>
      {detail ? <span className={`text-[10px] ${tone === 'text' ? 'text-text-faint' : color}`}>{detail}</span> : null}
      {badge ? <Badge kind="pnl-up">{badge}</Badge> : null}
    </span>
  );
}

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type StageTone = 'accent' | 'positive' | 'danger';

type StageCardProps = {
  title: string;
  count: number;
  subtitle: string;
  loading: boolean;
  loadingLabel: string;
  tone: StageTone;
  live: boolean;
  action?: ReactNode;
};

const toneClass: Record<StageTone, string> = {
  accent: 'text-accent',
  positive: 'text-positive',
  danger: 'text-danger',
};

const glowClass: Record<StageTone, string> = {
  accent: 'bg-accent/5',
  positive: 'bg-positive/5',
  danger: 'bg-danger/10',
};

export function StageCard({ title, count, subtitle, loading, loadingLabel, tone, live, action }: StageCardProps) {
  const showSpinner = loading && count === 0;
  const numberClass = count > 0 && tone !== 'accent' ? toneClass[tone] : 'text-text';

  return (
    <div
      className={`p-3.5 rounded-lg border relative overflow-hidden flex flex-col justify-between transition-colors ${
        live ? 'bg-danger/10 border-danger/40' : 'bg-canvas border-border'
      }`}
    >
      <div className={`absolute right-0 top-0 w-16 h-16 rounded-full -mr-4 -mt-4 ${glowClass[tone]}`} />
      <div>
        <div className="text-body-sm text-text-faint mb-1">{title}</div>
        <div className="font-mono text-display text-text flex items-center gap-2">
          {showSpinner ? (
            <span className={`flex items-center gap-2 ${toneClass[tone]}`}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-body-sm">{loadingLabel}</span>
            </span>
          ) : (
            <span className={numberClass}>{count}</span>
          )}
        </div>
        <div className={`mt-1 ${live ? 'font-mono font-medium text-danger animate-pulse' : 'text-text-muted'}`}>{subtitle}</div>
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface FunnelStageCardProps {
  stepTitle: string;
  count: number;
  subtitle: string;
  isLoading: boolean;
  loadingLabel?: string;
  accentColor?: 'teal' | 'emerald' | 'red';
  isLiveOrder?: boolean;
  extraAction?: React.ReactNode;
}

export function FunnelStageCard({
  stepTitle,
  count,
  subtitle,
  isLoading,
  loadingLabel = "Evaluating...",
  accentColor = "teal",
  isLiveOrder = false,
  extraAction,
}: FunnelStageCardProps) {
  // If actively running and count is still 0, show evaluating spinner
  const showSpinner = isLoading && count === 0;

  const colorClasses: Record<string, string> = {
    teal: 'text-teal-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
  };

  const glowClasses: Record<string, string> = {
    teal: 'bg-teal-500/5',
    emerald: 'bg-emerald-500/5',
    red: 'bg-red-500/10',
  };

  return (
    <div
      className={`p-3.5 rounded-lg border relative overflow-hidden flex flex-col justify-between transition-colors ${
        isLiveOrder
          ? 'bg-red-950/20 border-red-500/40 shadow-inner'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div
        className={`absolute right-0 top-0 w-16 h-16 rounded-full -mr-4 -mt-4 ${
          glowClasses[accentColor] || glowClasses.teal
        }`}
      />
      <div>
        <div className="text-xs text-slate-500 font-medium mb-1">{stepTitle}</div>
        <div className="text-2xl font-bold font-mono text-slate-100 flex items-center gap-2">
          {showSpinner ? (
            <span className={`flex items-center gap-2 ${colorClasses[accentColor] || 'text-teal-400'} text-lg`}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs font-normal">{loadingLabel}</span>
            </span>
          ) : (
            <span className={count > 0 && accentColor !== 'teal' ? (colorClasses[accentColor] || 'text-slate-100') : 'text-slate-100'}>
              {count}
            </span>
          )}
        </div>
        <div className={`text-[10px] mt-1 ${isLiveOrder ? 'font-mono font-medium text-red-400 animate-pulse' : 'text-slate-400'}`}>
          {subtitle}
        </div>
      </div>
      {extraAction && <div className="mt-3">{extraAction}</div>}
    </div>
  );
}

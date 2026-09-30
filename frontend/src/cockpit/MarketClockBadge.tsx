import React, { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { calculateMarketStatus, MarketStatusInfo } from '../utils/marketClock';

interface MarketClockBadgeProps {
  lastSyncTime?: string | null; // Trigger recalculation strictly on portfolio sync
  className?: string;
}

export const MarketClockBadge: React.FC<MarketClockBadgeProps> = ({
  lastSyncTime,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Pure event-driven computation: recalculates exclusively on mount and whenever lastSyncTime updates
  const status: MarketStatusInfo = useMemo(() => {
    return calculateMarketStatus(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSyncTime]);

  const { 
    isOpen, 
    statusText, 
    targetAction, 
    formattedETTime, 
    formattedLocalTime, 
    relativeTimeText, 
    formattedNewYorkTime,
    isLocalTimeDifferent,
    localTimezoneShort 
  } = status;

  return (
    <div
      id="market_clock_badge"
      className={`relative inline-flex items-center group cursor-pointer max-w-full ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <div
        className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-mono border transition-all shadow-sm select-none max-w-full overflow-hidden ${
          isOpen
            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
            : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
        }`}
      >
        {/* Status Indicator Dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          {isOpen ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <span className="inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          )}
        </span>

        {/* Status Text */}
        <span className="font-bold text-[10px] sm:text-[11px] whitespace-nowrap">
          {statusText}
        </span>
        <span className="text-slate-500 font-sans">·</span>

        {/* Target Action & ET Time */}
        <span className="text-[10px] sm:text-[11px] text-slate-300 whitespace-nowrap">
          {targetAction} <span className="font-semibold text-slate-100">{formattedETTime}</span>
        </span>

        {/* Relative time on desktop / tablet */}
        <span className="text-[10px] sm:text-[11px] text-slate-400 whitespace-nowrap hidden xs:inline sm:inline">
          ({relativeTimeText})
        </span>

        <Clock className={`h-3 w-3 shrink-0 ${isOpen ? 'text-emerald-400' : 'text-slate-400'}`} />
      </div>

      {/* Floating Detailed Tooltip */}
      {showTooltip && (
        <div
          id="market_clock_tooltip"
          className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-1.5 z-50 p-2.5 bg-slate-950 text-slate-100 text-xs rounded-lg shadow-2xl border border-slate-700 font-mono space-y-1 min-w-[220px] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-1.5 text-teal-400 font-bold text-[11px] pb-1 border-b border-slate-800">
            <Clock className="h-3 w-3" />
            <span>US Market Schedule</span>
          </div>
          <div className="text-[10px] text-slate-300 pt-0.5">
            <span className="text-slate-500 block">Exchange Time:</span>
            <span className="font-semibold text-slate-100">{formattedNewYorkTime}</span>
          </div>
          {isLocalTimeDifferent && (
            <div className="text-[10px] text-slate-300">
              <span className="text-slate-500 block">Your Local Time ({localTimezoneShort || 'Local'}):</span>
              <span className="font-semibold text-amber-300">{formattedLocalTime} ({relativeTimeText})</span>
            </div>
          )}
          {!isLocalTimeDifferent && (
            <div className="text-[10px] text-slate-400">
              <span>Target: {relativeTimeText}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketClockBadge;

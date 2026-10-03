import React from 'react';
import { 
  RefreshCw, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Loader2 
} from 'lucide-react';
import { TelemetryData, StrategyDials } from '../../types';
import { MarketClockBadge } from '../MarketClockBadge';

interface PortfolioBannerProps {
  placeOrders: boolean;
  isFetchingPortfolio: boolean;
  telemetry: TelemetryData;
  dials: StrategyDials;
  portfolioLastSync: string | null;
  fetchLivePortfolio: (notify?: boolean, saveSnapshot?: boolean) => void;
}

export function PortfolioBanner({
  placeOrders,
  isFetchingPortfolio,
  telemetry,
  dials,
  portfolioLastSync,
  fetchLivePortfolio,
}: PortfolioBannerProps) {
  return (
    <div className={`border-t px-4 py-2.5 sm:px-6 lg:px-8 text-xs text-slate-300 transition-colors ${
      placeOrders ? 'bg-red-950/20 border-red-900/30' : 'bg-slate-950/60 border-slate-850'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-wrap gap-y-2 items-center justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Portfolio value:</span>
            {isFetchingPortfolio ? (
              <span className="inline-flex items-center gap-1 text-teal-400 font-mono font-semibold animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[11px] text-slate-400">Updating...</span>
              </span>
            ) : (
              <span className="text-slate-100 font-mono font-semibold">${telemetry.portfolio.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            )}
            <button
              id="btn_sync_alpaca_desktop"
              onClick={() => fetchLivePortfolio(true, true)}
              title="Sync live portfolio from Alpaca and record snapshot"
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-teal-400 transition-colors cursor-pointer ml-0.5 active:scale-95"
            >
              <RefreshCw className={`h-3 w-3 ${isFetchingPortfolio ? 'animate-spin text-teal-400' : ''}`} />
            </button>
            {portfolioLastSync && !isFetchingPortfolio && (
              <span 
                id="portfolio_last_sync_badge"
                className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 ml-1" 
                title="Alpaca portfolio last synchronized timestamp"
              >
                <Clock className="h-2.5 w-2.5 text-teal-400" />
                <span className="text-slate-500">Updated:</span>
                <span className="text-slate-300">{portfolioLastSync}</span>
              </span>
            )}
            <MarketClockBadge lastSyncTime={portfolioLastSync} className="ml-2" />
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Daily P&L:</span>
            {isFetchingPortfolio ? (
              <span className="inline-flex items-center gap-1 text-teal-400 font-mono font-semibold animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[11px] text-slate-400">Updating...</span>
              </span>
            ) : (
              <span className={`font-semibold font-mono flex items-center ${telemetry.portfolio.daily_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {telemetry.portfolio.daily_pnl >= 0 ? '+' : '-'}${Math.abs(telemetry.portfolio.daily_pnl).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                <span className="text-[10px] ml-1">({Number(telemetry.portfolio.daily_pnl_pct || 0).toFixed(2)}%)</span>
                {telemetry.portfolio.daily_pnl >= 0 ? <ArrowUpRight className="h-3 w-3 ml-0.5" /> : <ArrowDownRight className="h-3 w-3 ml-0.5" />}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Positions:</span>
            {isFetchingPortfolio ? (
              <span className="inline-flex items-center gap-1 text-teal-400 font-mono font-semibold animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[11px] text-slate-400">Updating...</span>
              </span>
            ) : (
              <span className="text-slate-100 font-semibold">{telemetry.portfolio.open_positions} <span className="text-slate-500">/ {dials?.risk?.MAX_OPEN_POSITIONS ?? 4} max</span></span>
            )}
          </span>
          <span className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
            <span className="text-slate-500 font-medium">VIX:</span>
            <span className="text-slate-100 font-semibold">{telemetry.portfolio.vix_level}</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/10">Calm</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">SPY Change:</span>
            <span className="text-emerald-400 font-semibold font-mono">+{telemetry.portfolio.spy_change_pct}%</span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          {placeOrders && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="h-3 w-3" /> LIVE TRADES ACTIVE
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
              telemetry.portfolio.hours_to_next_macro !== null && telemetry.portfolio.hours_to_next_macro <= 2.0 
                ? 'bg-amber-400 animate-ping' 
                : 'bg-emerald-500'
            }`}></span>
            <span className="text-slate-500">Macro Event:</span>
            <span className="text-slate-300 font-medium">
              {telemetry.portfolio.hours_to_next_macro !== null && telemetry.portfolio.hours_to_next_macro !== undefined
                ? `${telemetry.portfolio.hours_to_next_macro} hrs`
                : 'None (>24h)'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

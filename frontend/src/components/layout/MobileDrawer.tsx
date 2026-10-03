import React from 'react';
import { 
  RefreshCw, 
  XCircle, 
  Clock, 
  Loader2 
} from 'lucide-react';
import { TelemetryData, StrategyDials } from '../../types';
import { MarketClockBadge } from '../MarketClockBadge';

interface MobileDrawerProps {
  isOpen: boolean;
  placeOrders: boolean;
  setPlaceOrders: (val: boolean) => void;
  ignoreMarketHours: boolean;
  setIgnoreMarketHours: (val: boolean) => void;
  showToast: (msg: string) => void;
  portfolioLastSync: string | null;
  fetchLivePortfolio: (notify?: boolean) => void;
  isFetchingPortfolio: boolean;
  portfolioError: string | null;
  telemetry: TelemetryData;
  dials: StrategyDials;
}

export function MobileDrawer({
  isOpen,
  placeOrders,
  setPlaceOrders,
  ignoreMarketHours,
  setIgnoreMarketHours,
  showToast,
  portfolioLastSync,
  fetchLivePortfolio,
  isFetchingPortfolio,
  portfolioError,
  telemetry,
  dials,
}: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="md:hidden bg-slate-950 border-t border-slate-800 p-3 space-y-3 animate-in slide-in-from-top duration-200 shadow-2xl max-h-[80vh] overflow-y-auto">
      {/* Toggles Row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Live Orders Switch */}
        <div className={`p-2 rounded-lg border flex flex-col justify-between gap-1.5 ${
          placeOrders 
            ? 'bg-red-950/40 border-red-500/50 text-red-300' 
            : 'bg-slate-900 border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${placeOrders ? 'text-red-400' : 'text-slate-300'}`}>
              {placeOrders ? 'LIVE TRADES ON' : 'SIMULATION'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={placeOrders}
              onClick={() => {
                const nextVal = !placeOrders;
                setPlaceOrders(nextVal);
                if (nextVal) {
                  showToast("⚠️ Live Order Execution ENABLED! Real paper orders will be submitted to Alpaca.");
                } else {
                  showToast("ℹ️ Returned to Simulation / Paper Mode (placeOrders=false).");
                }
              }}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                placeOrders ? 'bg-red-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  placeOrders ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">placeOrders={placeOrders ? 'true' : 'false'}</span>
        </div>

        {/* Force Closed Market Orders Switch */}
        <div className={`p-2 rounded-lg border flex flex-col justify-between gap-1.5 ${
          ignoreMarketHours 
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-300' 
            : 'bg-slate-900 border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${ignoreMarketHours ? 'text-amber-400' : 'text-slate-300'}`}>
              {ignoreMarketHours ? 'FORCE CLOSED' : 'CLOCK ENFORCED'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={ignoreMarketHours}
              onClick={() => {
                const nextVal = !ignoreMarketHours;
                setIgnoreMarketHours(nextVal);
                if (nextVal) {
                  showToast("⚠️ Force Closed Market Orders ENABLED! Orders will be placed/queued even when market is closed.");
                } else {
                  showToast("ℹ️ Market Clock Enforcement ENABLED (Orders blocked outside market hours).");
                }
              }}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                ignoreMarketHours ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  ignoreMarketHours ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">ignoreMarketHours={ignoreMarketHours ? 'true' : 'false'}</span>
        </div>
      </div>

      {/* Portfolio Details Card */}
      <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 text-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400 pb-2 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold text-slate-200">Portfolio Overview</span>
              {portfolioLastSync && (
                <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1 whitespace-nowrap bg-slate-950/70 px-1.5 py-0.5 rounded border border-slate-800">
                  <Clock className="h-2.5 w-2.5 text-teal-400 shrink-0" />
                  <span className="text-slate-500">Updated:</span>
                  <span className="text-slate-300 font-semibold">{portfolioLastSync}</span>
                </div>
              )}
            </div>
            <button
              id="btn_sync_alpaca_mobile_mini"
              onClick={() => fetchLivePortfolio(true)}
              className="sm:hidden flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 cursor-pointer active:scale-95 transition-all shrink-0"
              title="Sync Alpaca Portfolio"
            >
              <RefreshCw className={`h-2.5 w-2.5 ${isFetchingPortfolio ? 'animate-spin' : ''}`} />
              Sync
            </button>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto overflow-hidden">
            <MarketClockBadge lastSyncTime={portfolioLastSync} />
            <button
              id="btn_sync_alpaca_mobile"
              onClick={() => fetchLivePortfolio(true)}
              className="hidden sm:flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 cursor-pointer active:scale-95 transition-all shrink-0"
            >
              <RefreshCw className={`h-3 w-3 ${isFetchingPortfolio ? 'animate-spin' : ''}`} />
              Sync Alpaca
            </button>
          </div>
        </div>

        {portfolioError && (
          <div className="p-2 bg-rose-950/80 border border-rose-800/80 rounded text-[11px] text-rose-200 flex items-start gap-1.5 min-w-0">
            <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 break-words">
              <span className="font-bold text-rose-300">Alpaca Error: </span>
              <span className="font-mono text-rose-200 text-[10px] leading-tight">{portfolioError}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 font-mono">
          <div>
            <div className="text-[10px] text-slate-500 font-sans">Portfolio Value</div>
            {isFetchingPortfolio ? (
              <div className="flex items-center gap-1.5 text-teal-400 font-mono text-xs mt-0.5 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                <span className="text-[10px] text-slate-400 font-sans font-medium">Updating...</span>
              </div>
            ) : (
              <div className="text-slate-100 font-bold">${telemetry.portfolio.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            )}
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-sans">Daily P&L</div>
            {isFetchingPortfolio ? (
              <div className="flex items-center gap-1.5 text-teal-400 font-mono text-xs mt-0.5 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                <span className="text-[10px] text-slate-400 font-sans font-medium">Updating...</span>
              </div>
            ) : (
              <div className={`font-bold ${telemetry.portfolio.daily_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {telemetry.portfolio.daily_pnl >= 0 ? '+' : '-'}${Math.abs(telemetry.portfolio.daily_pnl).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ({Number(telemetry.portfolio.daily_pnl_pct || 0).toFixed(2)}%)
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-sans">Open Positions</div>
            {isFetchingPortfolio ? (
              <div className="flex items-center gap-1.5 text-teal-400 font-mono text-xs mt-0.5 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                <span className="text-[10px] text-slate-400 font-sans font-medium">Updating...</span>
              </div>
            ) : (
              <div className="text-slate-200 font-semibold">{telemetry.portfolio.open_positions} / {dials?.risk?.MAX_OPEN_POSITIONS ?? 4} max</div>
            )}
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-sans">VIX Level</div>
            <div className="text-slate-200 font-semibold">{telemetry.portfolio.vix_level} <span className="text-[9px] text-emerald-400 font-sans">(Calm)</span></div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-sans">SPY Change</div>
            <div className="text-emerald-400 font-semibold">+{telemetry.portfolio.spy_change_pct}%</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-sans">Macro Event</div>
            <div className="text-slate-300 font-semibold">{telemetry.portfolio.hours_to_next_macro} hrs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

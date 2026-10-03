import React from 'react';
import { 
  Activity, 
  Sliders, 
  Layers, 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle, 
  Clock, 
  XCircle 
} from 'lucide-react';
import { TelemetryData } from '../../types';

interface HeaderProps {
  activeTab: 'last_run' | 'config' | 'spec';
  setActiveTab: (tab: 'last_run' | 'config' | 'spec') => void;
  placeOrders: boolean;
  setPlaceOrders: (val: boolean) => void;
  ignoreMarketHours: boolean;
  setIgnoreMarketHours: (val: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
  portfolioError: string | null;
  telemetry: TelemetryData;
}

export function Header({
  activeTab,
  setActiveTab,
  placeOrders,
  setPlaceOrders,
  ignoreMarketHours,
  setIgnoreMarketHours,
  mobileMenuOpen,
  setMobileMenuOpen,
  showToast,
  portfolioError,
  telemetry,
}: HeaderProps) {
  return (
    <header id="cockpit_header" className={`border-b sticky top-0 z-30 transition-all duration-300 ${
      placeOrders 
        ? 'bg-slate-950 border-red-500/40 shadow-lg shadow-red-950/30' 
        : 'bg-slate-950 border-slate-800'
    }`}>
      {/* MOBILE COMPACT HEADER BAR (md:hidden) */}
      <div className="md:hidden px-3 py-2 flex items-center justify-between gap-2">
        {/* Left: Brand & Mode */}
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded border ${
            placeOrders ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
          }`}>
            <Activity className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-100 truncate">Cockpit</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                placeOrders 
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' 
                  : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
              }`}>
                {placeOrders ? 'LIVE' : 'SIM'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Portfolio Summary Badge + Tab Switcher + Drawer Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Portfolio Badge (Clicking toggles drawer) */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-colors ${
              portfolioError 
                ? 'bg-rose-950/50 border-rose-500/50 text-rose-300' 
                : 'bg-slate-900 border-slate-800'
            }`}
            title={portfolioError ? `Alpaca Error: ${portfolioError}` : "Toggle portfolio & settings detail"}
          >
            {portfolioError && <XCircle className="h-3 w-3 text-rose-400 shrink-0" />}
            <span className="text-slate-200 font-semibold">${(telemetry.portfolio.value / 1000).toFixed(1)}k</span>
            <span className={`text-[10px] ${telemetry.portfolio.daily_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {telemetry.portfolio.daily_pnl >= 0 ? '+' : ''}{Number(telemetry.portfolio.daily_pnl_pct || 0).toFixed(2)}%
            </span>
          </button>

          {/* Mobile Tab Switcher */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              id="mobile_tab_last_run"
              onClick={() => setActiveTab('last_run')}
              className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 ${
                activeTab === 'last_run' ? 'bg-slate-800 text-teal-400 font-medium' : 'text-slate-400'
              }`}
              title="Last Run Telemetry"
            >
              <Activity className="h-3.5 w-3.5" />
            </button>
            <button
              id="mobile_tab_config"
              onClick={() => setActiveTab('config')}
              className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 ${
                activeTab === 'config' ? 'bg-slate-800 text-teal-400 font-medium' : 'text-slate-400'
              }`}
              title="Strategy Dials"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>
            <button
              id="mobile_tab_spec"
              onClick={() => setActiveTab('spec')}
              className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 ${
                activeTab === 'spec' ? 'bg-slate-800 text-teal-400 font-medium' : 'text-slate-400'
              }`}
              title="Design Spec"
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Drawer Toggle Chevron Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-1.5 rounded border transition-colors ${
              mobileMenuOpen 
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' 
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            aria-label="Toggle Mobile Controls Drawer"
          >
            {mobileMenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* DESKTOP HEADER LAYOUT (hidden md:block) */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border transition-all ${
              placeOrders ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
            }`}>
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors ${
                  placeOrders 
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' 
                    : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                }`}>
                  {placeOrders ? '🔴 LIVE ORDERS ACTIVE' : 'v0 simplest'}
                </span>
                <span className="text-slate-500 text-xs">
                  {placeOrders ? 'Real Alpaca Execution' : 'Sandbox / Simulation'}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">Trading Bot Cockpit</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            
            {/* Live Order Execution Toggle Switch */}
            <div 
              id="live_orders_switch_container"
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all ${
                placeOrders 
                  ? 'bg-red-950/40 border-red-500/50 text-red-300 shadow-md shadow-red-950/50 ring-1 ring-red-500/30' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {placeOrders ? (
                  <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
                ) : (
                  <Activity className="h-4 w-4 text-slate-500" />
                )}
                <div className="flex flex-col">
                  <span className={`text-[11px] font-bold leading-tight ${placeOrders ? 'text-red-400' : 'text-slate-300'}`}>
                    {placeOrders ? 'LIVE TRADES ON' : 'SIMULATION MODE'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    placeOrders = {placeOrders ? 'true' : 'false'}
                  </span>
                </div>
              </div>

              {/* Toggle Switch Button */}
              <button
                id="toggle_place_orders_switch"
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
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  placeOrders ? 'bg-red-500 focus:ring-red-500 ring-offset-slate-950' : 'bg-slate-700 focus:ring-teal-500 ring-offset-slate-950'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    placeOrders ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Force Closed Market Orders Toggle Switch */}
            <div 
              id="ignore_market_hours_switch_container"
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all ${
                ignoreMarketHours 
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-md shadow-amber-950/50 ring-1 ring-amber-500/30' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${ignoreMarketHours ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                <div className="flex flex-col">
                  <span className={`text-[11px] font-bold leading-tight ${ignoreMarketHours ? 'text-amber-400' : 'text-slate-300'}`}>
                    {ignoreMarketHours ? 'FORCE CLOSED ORDERS' : 'CLOCK ENFORCED'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    ignoreMarketHours = {ignoreMarketHours ? 'true' : 'false'}
                  </span>
                </div>
              </div>

              {/* Toggle Switch Button */}
              <button
                id="toggle_ignore_market_hours_switch"
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
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  ignoreMarketHours ? 'bg-amber-500 focus:ring-amber-500 ring-offset-slate-950' : 'bg-slate-700 focus:ring-teal-500 ring-offset-slate-950'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    ignoreMarketHours ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Nav Tabs */}
            <nav className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button 
                id="tab_last_run"
                onClick={() => setActiveTab('last_run')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'last_run' ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Activity className="h-3.5 w-3.5" />
                Last Run Telemetry
              </button>
              <button 
                id="tab_config"
                onClick={() => setActiveTab('config')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'config' ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Sliders className="h-3.5 w-3.5" />
                Strategy Dials
              </button>
              <button 
                id="tab_spec"
                onClick={() => setActiveTab('spec')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'spec' ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Layers className="h-3.5 w-3.5" />
                Design Spec
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  Sliders, 
  DollarSign, 
  Loader2, 
  Info 
} from 'lucide-react';
import { StrategyDials } from '../../types';
import { VARIABLE_INFO_REGISTRY, VariableInfo } from '../../utils/variableDescriptions';

interface StrategyDialsTabProps {
  strategyName: string;
  setStrategyName: (name: string) => void;
  isSavingConfig: boolean;
  handleSaveConfig: () => void;
  discardDials: () => void;
  proposeChanges: () => void;
  tempDials: StrategyDials;
  handleDialChange: (section: keyof StrategyDials, field: string, value: number) => void;
  setSelectedVariableInfo: (info: VariableInfo | null) => void;
}

export const StrategyDialsTab: React.FC<StrategyDialsTabProps> = ({
  strategyName,
  setStrategyName,
  isSavingConfig,
  handleSaveConfig,
  discardDials,
  proposeChanges,
  tempDials,
  handleDialChange,
  setSelectedVariableInfo,
}) => {
  return (
    <div id="dials_view" className="space-y-6">
      
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Interactive Strategy Dials Configuration</h2>
          <p className="text-xs text-slate-400 mt-1">
            Adjust parameter bounds below. Save named strategy presets directly into Neon PostgreSQL or review visual parameter diffs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Strategy Config Name Input */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 focus-within:border-teal-500 transition-colors">
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Strategy:</span>
            <input
              id="input_strategy_name"
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              placeholder="Strategy Profile Name"
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none w-48 sm:w-56"
            />
          </div>

          <button 
            id="btn_save_config_db"
            onClick={handleSaveConfig}
            disabled={isSavingConfig}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Save current strategy dial preset to Neon Database"
          >
            {isSavingConfig ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Database className="h-3.5 w-3.5" />
                Save Config
              </>
            )}
          </button>

          <button 
            id="btn_discard_config"
            onClick={discardDials}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 cursor-pointer transition-colors"
          >
            Discard
          </button>
          <button 
            id="btn_propose_config"
            onClick={proposeChanges}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-teal-400" />
            Visual Diff
          </button>
        </div>
      </div>

      {/* EDIT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* CARD 1: UNIVERSE FILTERS */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
            <Database className="h-4 w-4 text-teal-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">1. Universe filter constraints</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>MIN_PRICE ($)</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.MIN_PRICE)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="MIN_PRICE information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Only trade liquid stocks</span>
              </label>
              <input 
                type="number" 
                step="1"
                value={tempDials.universe.MIN_PRICE}
                onChange={(e) => handleDialChange('universe', 'MIN_PRICE', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>MIN_MARKET_CAP (Billions $)</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.MIN_MARKET_CAP_BILLIONS)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="MIN_MARKET_CAP information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Large & Mega caps only</span>
              </label>
              <input 
                type="number" 
                step="10"
                value={tempDials.universe.MIN_MARKET_CAP_BILLIONS}
                onChange={(e) => handleDialChange('universe', 'MIN_MARKET_CAP_BILLIONS', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>MIN ATR (%)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.MIN_ATR_PCT)}
                      className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                      title="Tap for details"
                      aria-label="MIN ATR % information"
                    >
                      <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                    </button>
                  </span>
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={tempDials.universe.MIN_ATR_PCT}
                  onChange={(e) => handleDialChange('universe', 'MIN_ATR_PCT', parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>MAX ATR (%)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.MAX_ATR_PCT)}
                      className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                      title="Tap for details"
                      aria-label="MAX ATR % information"
                    >
                      <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                    </button>
                  </span>
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={tempDials.universe.MAX_ATR_PCT}
                  onChange={(e) => handleDialChange('universe', 'MAX_ATR_PCT', parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>EARNINGS_WINDOW_DAYS</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.EARNINGS_WINDOW_DAYS)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="EARNINGS_WINDOW_DAYS information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Earnings avoid safety bounds</span>
              </label>
              <input 
                type="number" 
                step="1"
                value={tempDials.universe.EARNINGS_WINDOW_DAYS}
                onChange={(e) => handleDialChange('universe', 'EARNINGS_WINDOW_DAYS', parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>
          </div>
        </div>

        {/* CARD 2: MOMENTUM SCANNER */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
            <TrendingUp className="h-4 w-4 text-teal-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">2. Momentum scanner thresholds</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>TOP_N Candidates limit</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.TOP_N)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="TOP_N information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Limits Claude API token usage</span>
              </label>
              <input 
                type="number" 
                step="1"
                value={tempDials.scanner.TOP_N}
                onChange={(e) => handleDialChange('scanner', 'TOP_N', parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>MIN_SCORE (0 - 3)</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.MIN_SCORE)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="MIN_SCORE information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Minimum momentum requirements</span>
              </label>
              <input 
                type="number" 
                step="1"
                min="0"
                max="3"
                value={tempDials.scanner.MIN_SCORE}
                onChange={(e) => handleDialChange('scanner', 'MIN_SCORE', parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>RSI_MIN</span>
                    <button
                      type="button"
                      onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.RSI_MIN)}
                      className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                      title="Tap for details"
                      aria-label="RSI_MIN information"
                    >
                      <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                    </button>
                  </span>
                </label>
                <input 
                  type="number" 
                  step="1"
                  value={tempDials.scanner.RSI_MIN}
                  onChange={(e) => handleDialChange('scanner', 'RSI_MIN', parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>RSI_MAX</span>
                    <button
                      type="button"
                      onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.RSI_MAX)}
                      className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                      title="Tap for details"
                      aria-label="RSI_MAX information"
                    >
                      <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                    </button>
                  </span>
                </label>
                <input 
                  type="number" 
                  step="1"
                  value={tempDials.scanner.RSI_MAX}
                  onChange={(e) => handleDialChange('scanner', 'RSI_MAX', parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: GATE 1 HARD THREATS */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">3. Gate 1 Hard stress boundaries</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>VIX Index limit</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.vix_level_limit)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="VIX limit information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Block trades if market VIX exceeds</span>
              </label>
              <input 
                type="number" 
                step="1"
                value={tempDials.gate1.vix_level_limit}
                onChange={(e) => handleDialChange('gate1', 'vix_level_limit', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>SPY Daily Min (%)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.spy_change_pct_limit)}
                      className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                      title="Tap for details"
                      aria-label="SPY limit information"
                    >
                      <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                    </button>
                  </span>
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={tempDials.gate1.spy_change_pct_limit}
                  onChange={(e) => handleDialChange('gate1', 'spy_change_pct_limit', parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>Sector Daily Min (%)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.sector_change_pct_limit)}
                      className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                      title="Tap for details"
                      aria-label="Sector limit information"
                    >
                      <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                    </button>
                  </span>
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={tempDials.gate1.sector_change_pct_limit}
                  onChange={(e) => handleDialChange('gate1', 'sector_change_pct_limit', parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>Premarket Gap Limit (%)</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.premarket_gap_pct_limit)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="Premarket gap information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Avoid earnings gaps</span>
              </label>
              <input 
                type="number" 
                step="0.5"
                value={tempDials.gate1.premarket_gap_pct_limit}
                onChange={(e) => handleDialChange('gate1', 'premarket_gap_pct_limit', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>
          </div>
        </div>

        {/* CARD 4: INTELLIGENCE AGENTS (GATE 3 & 5) */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">4. LLM Gate & Edge thresholds</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>Gate 3 Min AI Confidence</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.MIN_CONFIDENCE)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="Gate 3 confidence information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Reject Claude direction if score under</span>
              </label>
              <input 
                type="number" 
                step="1"
                min="1"
                max="10"
                value={tempDials.gate3.MIN_CONFIDENCE}
                onChange={(e) => handleDialChange('gate3', 'MIN_CONFIDENCE', parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>WIN_PROB_BASE (%)</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.WIN_PROB_BASE)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="WIN_PROB_BASE information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Starting baseline win expectation</span>
              </label>
              <input 
                type="number" 
                step="1"
                value={tempDials.gate5.WIN_PROB_BASE}
                onChange={(e) => handleDialChange('gate5', 'WIN_PROB_BASE', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>MIN_EDGE_PCT (%)</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.MIN_EDGE_PCT)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="MIN_EDGE_PCT information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-teal-400">Strict EV survival threshold</span>
              </label>
              <input 
                type="number" 
                step="0.5"
                value={tempDials.gate5.MIN_EDGE_PCT}
                onChange={(e) => handleDialChange('gate5', 'MIN_EDGE_PCT', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-teal-400 focus:outline-none focus:border-teal-500 border-teal-500/30" 
              />
            </div>
          </div>
        </div>

        {/* CARD 5: RISK CONTROLS */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
            <Sliders className="h-4 w-4 text-teal-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">5. Sizing & Risk Controls</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>MAX_OPEN_POSITIONS</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.MAX_OPEN_POSITIONS)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="MAX_OPEN_POSITIONS information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Maximum concurrent open trades</span>
              </label>
              <input 
                type="number" 
                step="1"
                value={tempDials.risk.MAX_OPEN_POSITIONS}
                onChange={(e) => handleDialChange('risk', 'MAX_OPEN_POSITIONS', parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>Max Daily Loss (%)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.MAX_DAILY_LOSS_PCT)}
                      className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                      title="Tap for details"
                      aria-label="Max Daily Loss information"
                    >
                      <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                    </button>
                  </span>
                </label>
                <input 
                  type="number" 
                  step="0.5"
                  value={tempDials.risk.MAX_DAILY_LOSS_PCT}
                  onChange={(e) => handleDialChange('risk', 'MAX_DAILY_LOSS_PCT', parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>Max Drawdown (%)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.MAX_DRAWDOWN_PCT)}
                      className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                      title="Tap for details"
                      aria-label="Max Drawdown information"
                    >
                      <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                    </button>
                  </span>
                </label>
                <input 
                  type="number" 
                  step="0.5"
                  value={tempDials.risk.MAX_DRAWDOWN_PCT}
                  onChange={(e) => handleDialChange('risk', 'MAX_DRAWDOWN_PCT', parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>Kelly Fraction multiplier</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.KELLY_FRACTION)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="Kelly Fraction information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Fractional Kelly sizing buffer</span>
              </label>
              <input 
                type="number" 
                step="0.05"
                value={tempDials.risk.KELLY_FRACTION}
                onChange={(e) => handleDialChange('risk', 'KELLY_FRACTION', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>
          </div>
        </div>

        {/* CARD 6: GEOMETRY LEVELS */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
            <DollarSign className="h-4 w-4 text-teal-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">6. Trade Geometry Limits</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>ATR stop multiplier</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.atr_stop_multiplier)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="ATR stop multiplier information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Distance from entry to trailing stop</span>
              </label>
              <input 
                type="number" 
                step="0.1"
                value={tempDials.geometry.atr_stop_multiplier}
                onChange={(e) => handleDialChange('geometry', 'atr_stop_multiplier', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>Target RR multiple</span>
                  <button
                    type="button"
                    onClick={() => setSelectedVariableInfo(VARIABLE_INFO_REGISTRY.target_rr_multiple)}
                    className="text-slate-400 hover:text-teal-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Tap for details"
                    aria-label="Target RR multiple information"
                  >
                    <Info className="h-3.5 w-3.5 text-teal-400/80 hover:text-teal-300" />
                  </button>
                </span>
                <span className="text-[10px] text-slate-500">Target reward ratio (R:R ratio multiplier)</span>
              </label>
              <input 
                type="number" 
                step="0.5"
                value={tempDials.geometry.target_rr_multiple}
                onChange={(e) => handleDialChange('geometry', 'target_rr_multiple', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

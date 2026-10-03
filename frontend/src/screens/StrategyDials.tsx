import { AlertTriangle, Database, DollarSign, RotateCcw, Sliders, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import type { Dials } from '../types/dials';

type StrategyDialsProps = {
  dials: Dials;
  onChange: (section: keyof Dials, field: string, value: number) => void;
  onDiscard: () => void;
  onPropose: () => void;
};

export function StrategyDials({ dials, onChange, onDiscard, onPropose }: StrategyDialsProps) {
  return (
    <div id="dials_view" className="space-y-6">
            
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Interactive Strategy Dials Configuration</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust parameter bounds below. Changes are saved with a strict <strong>Propose-and-Confirm</strong> old-to-new visual diff step before writing to <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400 text-[10px]">backend/config.py</code>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  id="btn_discard_config"
                  role="secondary"
                  label="Discard Changes"
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={onDiscard}
                  disabled={false}
                  busy={false}
                  block={false}
                />
                <Button
                  id="btn_propose_config"
                  role="primary"
                  label="Propose Changes"
                  icon={<Sliders className="h-3.5 w-3.5" />}
                  onClick={onPropose}
                  disabled={false}
                  busy={false}
                  block={false}
                />
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
                      <span>MIN_PRICE ($)</span>
                      <span className="text-[10px] text-slate-500">Only trade liquid stocks</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={dials.universe.MIN_PRICE}
                      onChange={(e) => onChange('universe', 'MIN_PRICE', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>MIN_MARKET_CAP (Billions $)</span>
                      <span className="text-[10px] text-slate-500">Large & Mega caps only</span>
                    </label>
                    <input 
                      type="number" 
                      step="10"
                      value={dials.universe.MIN_MARKET_CAP_BILLIONS}
                      onChange={(e) => onChange('universe', 'MIN_MARKET_CAP_BILLIONS', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>MIN ATR (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={dials.universe.MIN_ATR_PCT}
                        onChange={(e) => onChange('universe', 'MIN_ATR_PCT', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>MAX ATR (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={dials.universe.MAX_ATR_PCT}
                        onChange={(e) => onChange('universe', 'MAX_ATR_PCT', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>EARNINGS_WINDOW_DAYS</span>
                      <span className="text-[10px] text-slate-500">Earnings avoid safety bounds</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={dials.universe.EARNINGS_WINDOW_DAYS}
                      onChange={(e) => onChange('universe', 'EARNINGS_WINDOW_DAYS', parseInt(e.target.value))}
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
                      <span>TOP_N Candidates limit</span>
                      <span className="text-[10px] text-slate-500">Limits Claude API token usage</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={dials.scanner.TOP_N}
                      onChange={(e) => onChange('scanner', 'TOP_N', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>MIN_SCORE (0 - 3)</span>
                      <span className="text-[10px] text-slate-500">Minimum momentum requirements</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      min="0"
                      max="3"
                      value={dials.scanner.MIN_SCORE}
                      onChange={(e) => onChange('scanner', 'MIN_SCORE', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>RSI_MIN</span>
                      </label>
                      <input 
                        type="number" 
                        step="1"
                        value={dials.scanner.RSI_MIN}
                        onChange={(e) => onChange('scanner', 'RSI_MIN', parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>RSI_MAX</span>
                      </label>
                      <input 
                        type="number" 
                        step="1"
                        value={dials.scanner.RSI_MAX}
                        onChange={(e) => onChange('scanner', 'RSI_MAX', parseInt(e.target.value))}
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
                      <span>VIX Index limit</span>
                      <span className="text-[10px] text-slate-500">Block trades if market VIX exceeds</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={dials.gate1.vix_level_limit}
                      onChange={(e) => onChange('gate1', 'vix_level_limit', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>SPY Daily Min (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={dials.gate1.spy_change_pct_limit}
                        onChange={(e) => onChange('gate1', 'spy_change_pct_limit', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>Sector Daily Min (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={dials.gate1.sector_change_pct_limit}
                        onChange={(e) => onChange('gate1', 'sector_change_pct_limit', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>Premarket Gap Limit (%)</span>
                      <span className="text-[10px] text-slate-500">Avoid earnings gaps</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={dials.gate1.premarket_gap_pct_limit}
                      onChange={(e) => onChange('gate1', 'premarket_gap_pct_limit', parseFloat(e.target.value))}
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
                      <span>Gate 3 Min AI Confidence</span>
                      <span className="text-[10px] text-slate-500">Reject Claude direction if score under</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      min="1"
                      max="10"
                      value={dials.gate3.MIN_CONFIDENCE}
                      onChange={(e) => onChange('gate3', 'MIN_CONFIDENCE', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>WIN_PROB_BASE (%)</span>
                      <span className="text-[10px] text-slate-500">Starting baseline win expectation</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={dials.gate5.WIN_PROB_BASE}
                      onChange={(e) => onChange('gate5', 'WIN_PROB_BASE', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>MIN_EDGE_PCT (%)</span>
                      <span className="text-[10px] text-teal-400">Strict EV survival threshold</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={dials.gate5.MIN_EDGE_PCT}
                      onChange={(e) => onChange('gate5', 'MIN_EDGE_PCT', parseFloat(e.target.value))}
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
                      <span>MAX_OPEN_POSITIONS</span>
                      <span className="text-[10px] text-slate-500">Maximum concurrent open trades</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={dials.risk.MAX_OPEN_POSITIONS}
                      onChange={(e) => onChange('risk', 'MAX_OPEN_POSITIONS', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>Max Daily Loss (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.5"
                        value={dials.risk.MAX_DAILY_LOSS_PCT}
                        onChange={(e) => onChange('risk', 'MAX_DAILY_LOSS_PCT', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>Max Drawdown (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.5"
                        value={dials.risk.MAX_DRAWDOWN_PCT}
                        onChange={(e) => onChange('risk', 'MAX_DRAWDOWN_PCT', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>Kelly Fraction allocation multiplier</span>
                      <span className="text-[10px] text-slate-500">Fractional Kelly sizing buffer</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={dials.risk.KELLY_FRACTION}
                      onChange={(e) => onChange('risk', 'KELLY_FRACTION', parseFloat(e.target.value))}
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
                      <span>ATR stop multiplier</span>
                      <span className="text-[10px] text-slate-500">Distance from entry to trailing stop</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={dials.geometry.atr_stop_multiplier}
                      onChange={(e) => onChange('geometry', 'atr_stop_multiplier', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>Target RR multiple</span>
                      <span className="text-[10px] text-slate-500">Target reward ratio (R:R ratio multiplier)</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={dials.geometry.target_rr_multiple}
                      onChange={(e) => onChange('geometry', 'target_rr_multiple', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>
  );
}
import { useState } from 'react';
import { AlertTriangle, Database, DollarSign, RotateCcw, Sliders, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DialField } from '../components/ui/dial-field';
import { DialSection } from '../components/ui/dial-section';
import { DialInfoSheet } from '../patterns/strategy/DialInfoSheet';
import type { Dials } from '../types/dials';
import { VARIABLE_INFO_REGISTRY, type VariableInfo } from '../utils/variableDescriptions';

type StrategyDialsProps = {
  dials: Dials;
  onChange: (section: keyof Dials, field: string, value: number) => void;
  onDiscard: () => void;
  onPropose: () => void;
};

export function StrategyDials({ dials, onChange, onDiscard, onPropose }: StrategyDialsProps) {
  const [info, setInfo] = useState<VariableInfo | null>(null);
  const showInfo = (key: string) => () => setInfo(VARIABLE_INFO_REGISTRY[key]);

  return (
    <div id="dials_view" className="space-y-6">
      <div className="bg-canvas p-5 rounded-xl border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-h2 text-text">Interactive Strategy Dials Configuration</h2>
          <p className="text-body-sm text-text-muted mt-1">
            Adjust parameter bounds below. Changes go through a <strong>Propose-and-Confirm</strong> old-to-new diff step, then save as a named, versioned preset in the Neon database.
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DialSection icon={<Database className="h-4 w-4" />} title="1. Universe filter constraints" tone="accent">
          <DialField label="MIN_PRICE ($)" hint="Only trade liquid stocks" step={1} integer={false} value={dials.universe.MIN_PRICE} onChange={(v) => onChange('universe', 'MIN_PRICE', v)} onInfo={showInfo('MIN_PRICE')} />
          <DialField label="MIN_MARKET_CAP (Billions $)" hint="Large & Mega caps only" step={10} integer={false} value={dials.universe.MIN_MARKET_CAP_BILLIONS} onChange={(v) => onChange('universe', 'MIN_MARKET_CAP_BILLIONS', v)} onInfo={showInfo('MIN_MARKET_CAP_BILLIONS')} />
          <div className="grid grid-cols-2 gap-3">
            <DialField label="MIN ATR (%)" step={0.1} integer={false} value={dials.universe.MIN_ATR_PCT} onChange={(v) => onChange('universe', 'MIN_ATR_PCT', v)} onInfo={showInfo('MIN_ATR_PCT')} />
            <DialField label="MAX ATR (%)" step={0.1} integer={false} value={dials.universe.MAX_ATR_PCT} onChange={(v) => onChange('universe', 'MAX_ATR_PCT', v)} onInfo={showInfo('MAX_ATR_PCT')} />
          </div>
          <DialField label="EARNINGS_WINDOW_DAYS" hint="Earnings avoid safety bounds" step={1} integer value={dials.universe.EARNINGS_WINDOW_DAYS} onChange={(v) => onChange('universe', 'EARNINGS_WINDOW_DAYS', v)} onInfo={showInfo('EARNINGS_WINDOW_DAYS')} />
        </DialSection>

        <DialSection icon={<TrendingUp className="h-4 w-4" />} title="2. Momentum scanner thresholds" tone="accent">
          <DialField label="TOP_N Candidates limit" hint="Limits Claude API token usage" step={1} integer value={dials.scanner.TOP_N} onChange={(v) => onChange('scanner', 'TOP_N', v)} onInfo={showInfo('TOP_N')} />
          <DialField label="MIN_SCORE (0 - 3)" hint="Minimum momentum requirements" step={1} min={0} max={3} integer value={dials.scanner.MIN_SCORE} onChange={(v) => onChange('scanner', 'MIN_SCORE', v)} onInfo={showInfo('MIN_SCORE')} />
          <div className="grid grid-cols-2 gap-3">
            <DialField label="RSI_MIN" step={1} integer value={dials.scanner.RSI_MIN} onChange={(v) => onChange('scanner', 'RSI_MIN', v)} onInfo={showInfo('RSI_MIN')} />
            <DialField label="RSI_MAX" step={1} integer value={dials.scanner.RSI_MAX} onChange={(v) => onChange('scanner', 'RSI_MAX', v)} onInfo={showInfo('RSI_MAX')} />
          </div>
        </DialSection>

        <DialSection icon={<AlertTriangle className="h-4 w-4" />} title="3. Gate 1 Hard stress boundaries" tone="danger">
          <DialField label="VIX Index limit" hint="Block trades if market VIX exceeds" step={1} integer={false} value={dials.gate1.vix_level_limit} onChange={(v) => onChange('gate1', 'vix_level_limit', v)} onInfo={showInfo('vix_level_limit')} />
          <div className="grid grid-cols-2 gap-3">
            <DialField label="SPY Daily Min (%)" step={0.1} integer={false} value={dials.gate1.spy_change_pct_limit} onChange={(v) => onChange('gate1', 'spy_change_pct_limit', v)} onInfo={showInfo('spy_change_pct_limit')} />
            <DialField label="Sector Daily Min (%)" step={0.1} integer={false} value={dials.gate1.sector_change_pct_limit} onChange={(v) => onChange('gate1', 'sector_change_pct_limit', v)} onInfo={showInfo('sector_change_pct_limit')} />
          </div>
          <DialField label="Premarket Gap Limit (%)" hint="Avoid earnings gaps" step={0.5} integer={false} value={dials.gate1.premarket_gap_pct_limit} onChange={(v) => onChange('gate1', 'premarket_gap_pct_limit', v)} onInfo={showInfo('premarket_gap_pct_limit')} />
        </DialSection>

        <DialSection icon={<Sparkles className="h-4 w-4" />} title="4. LLM Gate & Edge thresholds" tone="accent">
          <DialField label="Gate 3 Min AI Confidence" hint="Reject Claude direction if score under" step={1} min={1} max={10} integer value={dials.gate3.MIN_CONFIDENCE} onChange={(v) => onChange('gate3', 'MIN_CONFIDENCE', v)} onInfo={showInfo('MIN_CONFIDENCE')} />
          <DialField label="WIN_PROB_BASE (%)" hint="Starting baseline win expectation" step={1} integer={false} value={dials.gate5.WIN_PROB_BASE} onChange={(v) => onChange('gate5', 'WIN_PROB_BASE', v)} onInfo={showInfo('WIN_PROB_BASE')} />
          <DialField label="MIN_EDGE_PCT (%)" hint="Strict EV survival threshold" step={0.5} integer={false} emphasis value={dials.gate5.MIN_EDGE_PCT} onChange={(v) => onChange('gate5', 'MIN_EDGE_PCT', v)} onInfo={showInfo('MIN_EDGE_PCT')} />
        </DialSection>

        <DialSection icon={<Sliders className="h-4 w-4" />} title="5. Sizing & Risk Controls" tone="accent">
          <DialField label="MAX_OPEN_POSITIONS" hint="Maximum concurrent open trades" step={1} integer value={dials.risk.MAX_OPEN_POSITIONS} onChange={(v) => onChange('risk', 'MAX_OPEN_POSITIONS', v)} onInfo={showInfo('MAX_OPEN_POSITIONS')} />
          <div className="grid grid-cols-2 gap-3">
            <DialField label="Max Daily Loss (%)" step={0.5} integer={false} value={dials.risk.MAX_DAILY_LOSS_PCT} onChange={(v) => onChange('risk', 'MAX_DAILY_LOSS_PCT', v)} onInfo={showInfo('MAX_DAILY_LOSS_PCT')} />
            <DialField label="Max Drawdown (%)" step={0.5} integer={false} value={dials.risk.MAX_DRAWDOWN_PCT} onChange={(v) => onChange('risk', 'MAX_DRAWDOWN_PCT', v)} onInfo={showInfo('MAX_DRAWDOWN_PCT')} />
          </div>
          <DialField label="Kelly Fraction allocation multiplier" hint="Fractional Kelly sizing buffer" step={0.05} integer={false} value={dials.risk.KELLY_FRACTION} onChange={(v) => onChange('risk', 'KELLY_FRACTION', v)} onInfo={showInfo('KELLY_FRACTION')} />
        </DialSection>

        <DialSection icon={<DollarSign className="h-4 w-4" />} title="6. Trade Geometry Limits" tone="accent">
          <DialField label="ATR stop multiplier" hint="Distance from entry to trailing stop" step={0.1} integer={false} value={dials.geometry.atr_stop_multiplier} onChange={(v) => onChange('geometry', 'atr_stop_multiplier', v)} onInfo={showInfo('atr_stop_multiplier')} />
          <DialField label="Target RR multiple" hint="Target reward ratio (R:R ratio multiplier)" step={0.5} integer={false} value={dials.geometry.target_rr_multiple} onChange={(v) => onChange('geometry', 'target_rr_multiple', v)} onInfo={showInfo('target_rr_multiple')} />
        </DialSection>
      </div>

      {info ? <DialInfoSheet info={info} onClose={() => setInfo(null)} /> : null}
    </div>
  );
}

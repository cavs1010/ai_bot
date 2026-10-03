export interface TradeLevels {
  entry: number;
  stop: number;
  target: number;
  reward_risk: number;
}

export interface RiskSizing {
  shares: number;
  position_value: number;
  position_pct: number;
}

export interface CandidateResult {
  ticker: string;
  final_decision: string;
  g3_direction: 'BULLISH' | 'NEUTRAL' | 'BEARISH' | null;
  g3_confidence: number | null;
  ev: number | null;
  win_prob: number | null;
  position_confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  trade_levels: TradeLevels | null;
  risk_sizing: RiskSizing | null;
  risk_reject_reason: string | null;
  notes: string;
  exec_error?: string;
  shares?: number;
  position_value?: number;
  entry?: number;
  stop?: number;
  target?: number;
  [key: string]: any;
}

export interface FunnelCounts {
  universe_count: number;
  scanned_count: number;
  processed_count: number;
  gate5_buy_count: number;
  approved_count: number;
  placed_count: number;
}

export interface PortfolioTelemetry {
  value: number;
  daily_pnl: number;
  daily_pnl_pct: number;
  open_positions: number;
  max_positions: number;
  drawdown_pct: number;
  vix_level: number;
  spy_change_pct: number;
  hours_to_next_macro: number | null;
}

export interface TelemetryData {
  timestamp: string | null;
  portfolio: PortfolioTelemetry;
  funnel: FunnelCounts;
  results: CandidateResult[];
}

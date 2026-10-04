export type Candidate = {
  ticker: string;
  final_decision: string;
  g3_direction: string | null;
  g3_confidence: number | null;
  ev: number | null;
  win_prob: number | null;
  position_confidence: string | null;
  trade_levels: {
    entry: number;
    stop: number;
    target: number;
    reward_risk: number;
  } | null;
  risk_sizing: {
    shares: number;
    position_value: number;
    position_pct: number;
  } | null;
  risk_reject_reason: string | null;
  notes: string;
  exec_error?: string | null;
};

export type FunnelCounts = {
  universe_count: number;
  scanned_count: number;
  processed_count: number;
  gate5_buy_count: number;
  approved_count: number;
  placed_count: number;
};

export type PortfolioSnapshot = {
  value: number;
  daily_pnl: number;
  daily_pnl_pct: number;
  open_positions: number;
  max_positions: number;
  drawdown_pct: number;
  vix_level: number;
  spy_change_pct: number;
  hours_to_next_macro: number | null;
};

export type Telemetry = {
  timestamp: string | null;
  portfolio: PortfolioSnapshot;
  funnel: FunnelCounts;
  results: Candidate[];
};

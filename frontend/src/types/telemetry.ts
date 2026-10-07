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

// Stages 2–6 of one pipeline run. scanned_count is only known when the run's result arrives.
export type RunFunnelCounts = {
  scanned_count: number | null;
  processed_count: number;
  gate5_buy_count: number;
  approved_count: number;
  placed_count: number;
};

// Live Alpaca account (GET /api/portfolio/live)
export type LivePortfolio = {
  value: number;
  daily_pnl: number;
  daily_pnl_pct: number;
  open_positions: number;
};

// Market backdrop measured by a pipeline run (VIX, SPY, next macro event)
export type MarketSnapshot = {
  vix_level: number;
  spy_change_pct: number;
  hours_to_next_macro: number | null;
};

// The run started in this session; null until the user runs the pipeline
export type RunState = {
  timestamp: string | null;
  funnel: RunFunnelCounts;
  results: Candidate[];
  market: MarketSnapshot | null;
};

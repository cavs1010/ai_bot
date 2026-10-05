/**
 * Authoritative TypeScript Data Models for Neon PostgreSQL.
 * Introspected directly from the live Neon Database schema.
 */

// 1. universe_scan_batches
export interface UniverseScanBatch {
  id: number;
  scanned_at: string;
  total_tickers: number;
}

// 2. universe_watchlist_items
export interface UniverseWatchlistItem {
  batch_id: number;
  ticker: string;
  price: number;
  volume: number | null;
  atr: number | null;
  atr_pct: number | null;
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  sector: string | null;
}

// 3. pipeline_configs
export interface PipelineConfig {
  id?: number;
  name: string;
  parameters_json?: Record<string, any>; // LEGACY: no longer read or written by the app; column dropped in change 2c
  selection_params: Record<string, any>;
  money_params: Record<string, any>;
  created_at?: string;
  version?: number;
  is_default?: boolean;
}

// 4. pipeline_gates
export interface PipelineGate {
  id: number;
  gate_number: number;
  code: string;
  name: string;
  description: string;
  gate_type: string;
  is_active: boolean;
  created_at: string;
}

// 5. pipeline_runs
export interface PipelineRun {
  id: string; // uuid
  config_id?: number | null;
  status: string; // 'RUNNING' | 'SUCCESS' | 'FAILED'
  mode: string; // 'PAPER' | 'LIVE'
  total_candidates: number;
  orders_generated: number;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
}

// 6. portfolio_snapshots
export interface PortfolioSnapshot {
  id: number;
  snapshot_at: string;
  trigger_source: string;
  total_equity: number;
  cash: number;
  buying_power: number;
  day_pnl: number;
  day_pnl_pct: number;
  open_positions_count: number;
  positions_payload: any[];
}

// 7. scanned_stocks
export interface ScannedStock {
  run_id: string; // uuid
  ticker: string;
  batch_id: number;
  final_decision: string;
  rule_evaluations: Record<string, any>;
  created_at: string;
}

// 8. gate_evaluations
export interface GateEvaluation {
  id: number;
  run_id: string; // uuid
  ticker: string;
  gate_id: number;
  passed: boolean;
  score?: number | null;
  reasoning?: string | null;
  sub_evaluations: Record<string, any>;
  created_at: string;
}

// 9. order_executions
export interface OrderExecution {
  id: number;
  run_id: string; // uuid
  candidate_id?: number | null;
  symbol: string;
  client_order_id: string;
  alpaca_order_id?: string | null;
  side: string;
  order_type: string;
  qty: number;
  limit_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  filled_avg_price?: number | null;
  filled_qty?: number | null;
  status: string;
  raw_response?: Record<string, any> | null;
  created_at: string;
}

export interface UniverseDials {
  MIN_PRICE: number;
  MIN_MARKET_CAP_BILLIONS: number;
  MIN_ATR_PCT: number;
  MAX_ATR_PCT: number;
  EARNINGS_WINDOW_DAYS: number;
}

export interface ScannerDials {
  TOP_N: number;
  MIN_SCORE: number;
  RSI_MIN: number;
  RSI_MAX: number;
}

export interface Gate1Dials {
  vix_level_limit: number;
  spy_change_pct_limit: number;
  sector_change_pct_limit: number;
  premarket_gap_pct_limit: number;
  macro_hours_threshold: number;
  loss_limit_pct_limit: number;
}

export interface Gate3Dials {
  MIN_CONFIDENCE: number;
}

export interface Gate5Dials {
  WIN_PROB_BASE: number;
  MIN_EDGE_PCT: number;
}

export interface RiskDials {
  MAX_OPEN_POSITIONS: number;
  MAX_DAILY_LOSS_PCT: number;
  MAX_DRAWDOWN_PCT: number;
  KELLY_FRACTION: number;
}

export interface GeometryDials {
  atr_stop_multiplier: number;
  target_rr_multiple: number;
}

export interface StrategyDials {
  universe: UniverseDials;
  scanner: ScannerDials;
  gate1: Gate1Dials;
  gate3: Gate3Dials;
  gate5: Gate5Dials;
  risk: RiskDials;
  geometry: GeometryDials;
}

export interface DialDiffItem {
  path: string;
  oldVal: any;
  newVal: any;
  desc: string;
}

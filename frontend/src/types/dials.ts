export type Dials = {
  universe: {
    MIN_PRICE: number;
    MIN_MARKET_CAP_BILLIONS: number;
    MIN_ATR_PCT: number;
    MAX_ATR_PCT: number;
    EARNINGS_WINDOW_DAYS: number;
  };
  scanner: {
    TOP_N: number;
    MIN_SCORE: number;
    RSI_MIN: number;
    RSI_MAX: number;
  };
  gate1: {
    vix_level_limit: number;
    spy_change_pct_limit: number;
    sector_change_pct_limit: number;
    premarket_gap_pct_limit: number;
    macro_hours_threshold: number;
    loss_limit_pct_limit: number;
  };
  gate3: {
    MIN_CONFIDENCE: number;
  };
  gate5: {
    WIN_PROB_BASE: number;
    MIN_EDGE_PCT: number;
  };
  risk: {
    MAX_OPEN_POSITIONS: number;
    MAX_DAILY_LOSS_PCT: number;
    MAX_DRAWDOWN_PCT: number;
    KELLY_FRACTION: number;
  };
  geometry: {
    atr_stop_multiplier: number;
    target_rr_multiple: number;
  };
};

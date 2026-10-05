// Mirrors pipeline_configs.selection_params / money_params in Neon (values in Python pipeline units).
export type SelectionParams = {
  universe: {
    MIN_AVG_VOLUME: number;
    MIN_PRICE: number;
    MIN_ATR_PCT: number;
    MAX_ATR_PCT: number;
    MIN_MARKET_CAP: number;
    EARNINGS_WINDOW_DAYS: number;
    SCREENER_LIMIT: number;
  };
  scanner: {
    TOP_N: number;
    MIN_SCORE: number;
    RSI_MIN: number;
    RSI_MAX: number;
  };
  gate1: {
    vix_level: number;
    spy_change_pct: number;
    sector_change_pct: number;
    premarket_gap_pct: number;
    macro_hours: number;
    EARNINGS_THREAT_DAYS: number;
    FILING_LOOKBACK_DAYS: number;
  };
  news: {
    NEWS_LOOKBACK_DAYS: number;
    NEWS_MAX_RESULTS: number;
  };
  gate3: {
    MIN_CONFIDENCE: number;
  };
  gate5: {
    WIN_PROB_BASE: number;
    MOMENTUM_SCORE_MIN: number;
    MOMENTUM_SCORE_MAX: number;
    MOMENTUM_COMPONENT: number;
    CONFIDENCE_BASELINE: number;
    CONFIDENCE_COMPONENT: number;
    CAUTION_PENALTY: number;
    NEUTRAL_DIRECTION_PENALTY: number;
    WIN_PROB_FLOOR: number;
    WIN_PROB_CEILING: number;
    POSITION_CONFIDENCE_HIGH: number;
    POSITION_CONFIDENCE_MEDIUM: number;
    MIN_EDGE_PCT: number;
  };
};

export type MoneyParams = {
  position_size: {
    MAX_POSITION_SIZE_PCT: number;
    PRICE_CEILING_BUFFER: number;
    KELLY_FRACTION: number;
    CAUTION_SIZE_REDUCTION_PCT: number;
  };
  portfolio_limits: {
    MAX_OPEN_POSITIONS: number;
    MAX_DAILY_LOSS_PCT: number;
    MAX_DRAWDOWN_PCT: number;
  };
  trade_risk: {
    atr_stop_multiplier: number;
    target_rr_multiple: number;
    MIN_REWARD_RISK: number;
  };
};

export type Dials = {
  selection_params: SelectionParams;
  money_params: MoneyParams;
};

// GET /api/configs/active response row
export type StrategyConfig = Dials & {
  id: number;
  name: string;
  version: number;
  is_default: boolean;
  created_at: string;
};

export type DialDiff = {
  path: string;
  oldVal: number;
  newVal: number;
  desc: string;
};

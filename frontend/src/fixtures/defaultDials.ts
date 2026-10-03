import { StrategyDials } from '../types/dials';

export const initialDials: StrategyDials = {
  universe: {
    MIN_PRICE: 10.0,
    MIN_MARKET_CAP_BILLIONS: 100.0,
    MIN_ATR_PCT: 1.0,
    MAX_ATR_PCT: 5.0,
    EARNINGS_WINDOW_DAYS: 5
  },
  scanner: {
    TOP_N: 15,
    MIN_SCORE: 2,
    RSI_MIN: 50,
    RSI_MAX: 70
  },
  gate1: {
    vix_level_limit: 30.0,
    spy_change_pct_limit: -1.5,
    sector_change_pct_limit: -2.0,
    premarket_gap_pct_limit: 3.0,
    macro_hours_threshold: 2.0,
    loss_limit_pct_limit: 3.0
  },
  gate3: {
    MIN_CONFIDENCE: 6
  },
  gate5: {
    WIN_PROB_BASE: 35.0,
    MIN_EDGE_PCT: 4.0
  },
  risk: {
    MAX_OPEN_POSITIONS: 10,
    MAX_DAILY_LOSS_PCT: 3.0,
    MAX_DRAWDOWN_PCT: 8.0,
    KELLY_FRACTION: 0.25
  },
  geometry: {
    atr_stop_multiplier: 1.5,
    target_rr_multiple: 2.0
  }
};

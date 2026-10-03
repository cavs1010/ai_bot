import { TelemetryData } from '../types/telemetry';

export const initialTelemetry: TelemetryData = {
  timestamp: null,
  portfolio: {
    value: 100000.00,
    daily_pnl: 1250.00,
    daily_pnl_pct: 1.25,
    open_positions: 2,
    max_positions: 10,
    drawdown_pct: 1.5,
    vix_level: 14.50,
    spy_change_pct: 0.45,
    hours_to_next_macro: 4.5
  },
  funnel: {
    universe_count: 62,
    scanned_count: 15,
    processed_count: 10,
    gate5_buy_count: 3,
    approved_count: 3,
    placed_count: 0
  },
  results: [
    {
      ticker: "COF",
      final_decision: "BUY",
      g3_direction: "BULLISH",
      g3_confidence: 8,
      ev: 0.084,
      win_prob: 0.58,
      position_confidence: "HIGH",
      trade_levels: {
        entry: 135.00,
        stop: 129.50,
        target: 146.00,
        reward_risk: 2.0
      },
      risk_sizing: {
        shares: 39,
        position_value: 5265.00,
        position_pct: 5.26
      },
      risk_reject_reason: null,
      notes: "Strong macro momentum, sector bullish breakout"
    },
    {
      ticker: "MSFT",
      final_decision: "BUY",
      g3_direction: "BULLISH",
      g3_confidence: 9,
      ev: 0.065,
      win_prob: 0.52,
      position_confidence: "HIGH",
      trade_levels: {
        entry: 420.00,
        stop: 411.50,
        target: 437.00,
        reward_risk: 2.0
      },
      risk_sizing: {
        shares: 12,
        position_value: 5040.00,
        position_pct: 5.04
      },
      risk_reject_reason: null,
      notes: "Cloud business growth outperforming, passed Gate 4 sentiment convergence"
    },
    {
      ticker: "NVDA",
      final_decision: "BLOCKED_G1:sector",
      g3_direction: null,
      g3_confidence: null,
      ev: null,
      win_prob: null,
      position_confidence: null,
      trade_levels: null,
      risk_sizing: null,
      risk_reject_reason: "Sector premarket gap exceeds limit",
      notes: "Gate 1 rule block: Semiconductor sector drop is wider than standard safety margins"
    },
    {
      ticker: "AMD",
      final_decision: "BLOCKED_G3",
      g3_direction: "NEUTRAL",
      g3_confidence: 4,
      ev: null,
      win_prob: null,
      position_confidence: null,
      trade_levels: null,
      risk_sizing: null,
      risk_reject_reason: "Gate 3 AI sentiment confidence too low",
      notes: "Gate 3 Claude block: Sentiment direction neutral with insufficient score (4/10)"
    },
    {
      ticker: "BNY",
      final_decision: "SKIP",
      g3_direction: "BULLISH",
      g3_confidence: 6,
      ev: 0.012,
      win_prob: 0.38,
      position_confidence: "LOW",
      trade_levels: {
        entry: 80.00,
        stop: 78.50,
        target: 83.00,
        reward_risk: 2.0
      },
      risk_sizing: null,
      risk_reject_reason: "Expected Value (1.2%) below 4.0% minimum threshold",
      notes: "Gate 5 rule skip: Survived intelligence gates but failed minimum expected value criteria"
    },
    {
      ticker: "AAPL",
      final_decision: "BLOCKED_G2",
      g3_direction: "BEARISH",
      g3_confidence: 7,
      ev: null,
      win_prob: null,
      position_confidence: null,
      trade_levels: null,
      risk_sizing: null,
      risk_reject_reason: "Active hard news threat detected",
      notes: "Gate 2 news block: Negative litigation updates flagged on Bloomberg feed"
    }
  ]
};

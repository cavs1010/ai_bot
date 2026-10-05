export interface VariableInfo {
  key: string;
  label: string;
  category: string;
  formula?: string;
  summary: string;
  whyItMatters: string;
  ruleOfThumb: string;
  examples?: string;
}

export const VARIABLE_INFO_REGISTRY: Record<string, VariableInfo> = {
  // --- SECTION 1: UNIVERSE FILTER CONSTRAINTS ---
  MIN_PRICE: {
    key: 'MIN_PRICE',
    label: 'MIN_PRICE ($)',
    category: '1. Universe Filter Constraints',
    summary: 'Minimum share price threshold required for a ticker to enter the trade universe.',
    whyItMatters: 'Penny stocks and sub-$10 equities suffer from wide bid-ask spreads, low liquidity, and unpredictable slippage during order execution.',
    ruleOfThumb: '$10 - $20 is the industry standard floor for clean institutional liquidity.',
    examples: 'Set to $10: excludes stocks trading below $10.00.'
  },
  MIN_MARKET_CAP: {
    key: 'MIN_MARKET_CAP',
    label: 'MIN_MARKET_CAP (Billions $)',
    category: '1. Universe Filter Constraints',
    summary: 'Minimum company market capitalization in billions of USD.',
    whyItMatters: 'Large and mega-cap corporations have robust public filings, heavy institutional coverage, and high daily trading volume.',
    ruleOfThumb: '>$10B (Large Cap) or >$100B (Mega Cap). Keeps the universe focused on liquid, reliable leaders.',
    examples: 'Set to 100: limits universe to mega-caps like AAPL, MSFT, NVDA, TSLA.'
  },
  MIN_ATR_PCT: {
    key: 'MIN_ATR_PCT',
    label: 'MIN ATR (%) — Volatility Floor',
    category: '1. Universe Filter Constraints',
    formula: 'ATR % = (14-Day ATR in USD / Current Share Price) × 100',
    summary: 'Minimum daily price movement range required over the past 14 trading days.',
    whyItMatters: 'Filters out stagnant, ultra-low volatility stocks (e.g. slow utilities or bond-like equities) that cannot generate enough price movement to reach profit targets.',
    ruleOfThumb: '1.0% - 1.5% minimum ensures the stock has enough daily energy to trade.',
    examples: 'If a $100 stock moves $1.50/day on average, its ATR % is 1.5% (passes a 1.0% floor).'
  },
  MAX_ATR_PCT: {
    key: 'MAX_ATR_PCT',
    label: 'MAX ATR (%) — Wild Volatility Ceiling',
    category: '1. Universe Filter Constraints',
    formula: 'ATR % = (14-Day ATR in USD / Current Share Price) × 100',
    summary: 'Maximum acceptable daily price swing ceiling over the past 14 trading days.',
    whyItMatters: 'Protects the portfolio from hyper-volatile, chaotic, or meme-like price swings where gap risk is extreme and stop-losses get whipsawed frequently.',
    ruleOfThumb: '4.0% - 6.0% ceiling keeps volatility manageable and predictable.',
    examples: 'A high-beta biotech moving 8% per day will be safely filtered out if MAX ATR is 5%.'
  },
  EARNINGS_WINDOW_DAYS: {
    key: 'EARNINGS_WINDOW_DAYS',
    label: 'EARNINGS_WINDOW_DAYS',
    category: '1. Universe Filter Constraints',
    summary: 'Stocks reporting earnings within the next this-many days are removed from the universe.',
    whyItMatters: 'Earnings releases introduce binary overnight gap risk (5-20% jumps/drops) that invalidates technical analysis and standard stop-loss protection.',
    ruleOfThumb: '5 - 7 days buffer prevents entering positions right before earnings announcements.',
    examples: 'Set to 5: skips tickers reporting earnings within the next 5 days.'
  },

  // --- SECTION 2: MOMENTUM SCANNER THRESHOLDS ---
  TOP_N: {
    key: 'TOP_N',
    label: 'TOP_N Candidates Limit',
    category: '2. Momentum Scanner Thresholds',
    summary: 'Maximum number of top-ranked momentum candidates passed into the AI Intelligence pipeline.',
    whyItMatters: 'Controls computational throughput, API token costs, and concentrates execution capital into the highest-conviction momentum setups.',
    ruleOfThumb: '10 - 20 candidates is the optimal balance between breadth and deep LLM analysis cost.',
    examples: 'Set to 15: only the 15 highest-scoring momentum tickers are evaluated by the AI gates.'
  },
  MIN_SCORE: {
    key: 'MIN_SCORE',
    label: 'MIN_SCORE (0 - 3)',
    category: '2. Momentum Scanner Thresholds',
    formula: 'Score = RSI between RSI_MIN and RSI_MAX (1 pt) + Price > SMA20 (1 pt) + SMA20 > SMA50 (1 pt)',
    summary: 'Minimum momentum score (0 - 3) needed to qualify as a momentum candidate.',
    whyItMatters: 'Ensures candidates have a healthy RSI, a short-term uptrend, and a bullish moving-average structure before the paid AI gates.',
    ruleOfThumb: 'Score ≥ 2 filters out weak or contradictory momentum charts.',
    examples: 'Score 3/3 = RSI in the momentum zone + price above SMA20 + SMA20 above SMA50.'
  },
  RSI_MIN: {
    key: 'RSI_MIN',
    label: 'RSI_MIN (14-Day)',
    category: '2. Momentum Scanner Thresholds',
    summary: 'Lower bound of the RSI momentum zone. A stock with RSI between RSI_MIN and RSI_MAX earns 1 momentum-score point.',
    whyItMatters: 'Ensures the stock is in active accumulation and not languishing in a downtrend or oversold bear trap.',
    ruleOfThumb: '50 - 55 ensures bullish momentum regime.',
    examples: 'RSI > 50 confirms bulls are in control on the daily timeframe.'
  },
  RSI_MAX: {
    key: 'RSI_MAX',
    label: 'RSI_MAX (14-Day)',
    category: '2. Momentum Scanner Thresholds',
    summary: 'Upper bound of the RSI momentum zone. Above it the stock is considered overbought and does not earn the RSI point.',
    whyItMatters: 'Prevents buying into exhausted, parabolic moves where immediate mean-reversion pullbacks are statistically likely.',
    ruleOfThumb: '68 - 72 avoids chasing blow-off tops.',
    examples: 'RSI 78 is overextended; RSI 62 is ideal healthy momentum.'
  },

  // --- SECTION 3: GATE 1 HARD THREAT BOUNDARIES ---
  vix_level: {
    key: 'vix_level',
    label: 'VIX Index Limit',
    category: '3. Gate 1 Hard Stress Boundaries',
    summary: 'Macro market fear index (CBOE Volatility Index) hard stop ceiling.',
    whyItMatters: 'When market-wide implied volatility spikes above this level, equity correlations converge to 1 and broad market panic renders single-stock edges unreliable.',
    ruleOfThumb: 'VIX > 30 represents severe market stress; all new long trades should be halted.',
    examples: 'If VIX is 32.5, Gate 1 instantly blocks all new buy entries.'
  },
  spy_change_pct: {
    key: 'spy_change_pct',
    label: 'SPY Daily Min (%)',
    category: '3. Gate 1 Hard Stress Boundaries',
    summary: 'Minimum benchmark daily return (S&P 500 ETF) allowed for new long entries.',
    whyItMatters: 'Over 75% of individual stocks follow broad market direction. Opening longs during severe market sell-offs sharply degrades win probability.',
    ruleOfThumb: '-1.5% to -2.0% threshold halts long trades on heavy market distribution days.',
    examples: 'If SPY is down -2.2%, Gate 1 blocks all new long positions.'
  },
  sector_change_pct: {
    key: 'sector_change_pct',
    label: 'Sector Daily Min (%)',
    category: '3. Gate 1 Hard Stress Boundaries',
    summary: 'Minimum daily performance allowed for the candidate stock\'s corresponding sector ETF (e.g. XLK, XLF).',
    whyItMatters: 'Sector headwinds drag down otherwise strong individual stocks. Swimming against sector flow causes false breakouts.',
    ruleOfThumb: '-2.0% to -2.5% sector drop flags severe localized risk.',
    examples: 'If AMD is scanning but the Technology sector ETF (XLK) is down -3.1%, entry is blocked.'
  },
  premarket_gap_pct: {
    key: 'premarket_gap_pct',
    label: 'Premarket Gap Limit (%)',
    category: '3. Gate 1 Hard Stress Boundaries',
    summary: 'Maximum premarket gap from the previous day\'s close, up or down. A gap at or beyond this size blocks the stock.',
    whyItMatters: 'Large premarket gaps (>3-4%) frequently lead to aggressive gap-fade profit-taking at the opening bell.',
    ruleOfThumb: '3.0% - 4.0% limit protects from opening-bell slippage and instant reversals.',
    examples: 'A stock gapping up 6.5% premarket is skipped to avoid buying the open trap.'
  },

  // --- SECTION 4: LLM GATE & EDGE THRESHOLDS ---
  MIN_CONFIDENCE: {
    key: 'MIN_CONFIDENCE',
    label: 'Gate 3 Min AI Confidence (1 - 10)',
    category: '4. LLM Gate & Edge Thresholds',
    summary: 'Confidence cutoff for the Gate 3 sentiment call. Below it, a NEUTRAL call is blocked and a BULLISH call passes with a reduced position size. A BEARISH call is always blocked.',
    whyItMatters: 'Weak conviction should not get a full-size position; it either trades smaller or not at all.',
    ruleOfThumb: '6 - 7 out of 10 ensures high conviction in narrative tailwinds.',
    examples: 'Score 8/10 = clear positive earnings beat, analyst upgrade, and product momentum.'
  },
  WIN_PROB_BASE: {
    key: 'WIN_PROB_BASE',
    label: 'WIN_PROB_BASE (%)',
    category: '4. LLM Gate & Edge Thresholds',
    summary: 'Assumed starting win probability before momentum and Gate 3 confidence adjustments.',
    whyItMatters: 'Serves as the conservative starting anchor in the expected value and Kelly position sizing formulas.',
    ruleOfThumb: '35.0% - 40.0% is a disciplined, conservative momentum baseline.',
    examples: 'Starting at 35%, a 3/3 momentum score and high Gate 3 confidence can raise it to the 70% ceiling.'
  },
  MIN_EDGE_PCT: {
    key: 'MIN_EDGE_PCT',
    label: 'MIN_EDGE_PCT (%)',
    category: '4. LLM Gate & Edge Thresholds',
    formula: 'EV = (Win Prob × Reward:Risk) - (1 - Win Prob), measured in units of the amount risked',
    summary: 'Minimum expected value required for Gate 5 to issue a BUY. EV is expressed as a fraction of the amount risked on the trade.',
    whyItMatters: 'Ensures only statistically positive-expectation trades receive capital allocation.',
    ruleOfThumb: '≥ 4.0% (EV of at least 0.04× the amount risked) covers transaction fees, slippage, and execution friction.',
    examples: 'With a 2:1 reward:risk and a 35% win probability, EV = 0.35 × 2 - 0.65 = 0.05 (5%), which passes a 4% hurdle.'
  },

  // --- SECTION 5: RISK & POSITION SIZING ---
  MAX_OPEN_POSITIONS: {
    key: 'MAX_OPEN_POSITIONS',
    label: 'MAX_OPEN_POSITIONS',
    category: '5. Risk & Position Sizing',
    summary: 'Maximum number of concurrent active holdings allowed in the portfolio.',
    whyItMatters: 'Prevents over-diversification (diluting top performers) and caps maximum simultaneous market exposure.',
    ruleOfThumb: '8 - 12 positions allows focused alpha while maintaining sector diversification.',
    examples: 'Set to 10: new signals are rejected if the account already holds 10 active positions.'
  },
  MAX_DAILY_LOSS_PCT: {
    key: 'MAX_DAILY_LOSS_PCT',
    label: 'MAX_DAILY_LOSS_PCT (%)',
    category: '5. Risk & Position Sizing',
    summary: 'Daily portfolio drawdown circuit breaker.',
    whyItMatters: 'If the total account drops by this percentage in a single trading day, all new buys are blocked to stop compounding losses.',
    ruleOfThumb: '2.0% - 3.0% of total portfolio equity.',
    examples: 'On a $100k account, a $3,000 intraday loss blocks all new buys for the day.'
  },
  MAX_DRAWDOWN_PCT: {
    key: 'MAX_DRAWDOWN_PCT',
    label: 'MAX_DRAWDOWN_PCT (%)',
    category: '5. Risk & Position Sizing',
    summary: 'Peak-to-trough account drawdown safety limit.',
    whyItMatters: 'The ultimate survival metric for quantitative trading systems. Prevents deep capital destruction during prolonged adverse regimes.',
    ruleOfThumb: '6.0% - 10.0% max drawdown threshold.',
    examples: 'If the account drops 8% from its high-water mark, all new buys are halted.'
  },
  KELLY_FRACTION: {
    key: 'KELLY_FRACTION',
    label: 'KELLY_FRACTION',
    category: '5. Risk & Position Sizing',
    formula: 'Position % = min(KELLY_FRACTION × (Win Prob - (1 - Win Prob) / Reward:Risk), MAX_POSITION_SIZE_PCT)',
    summary: 'Fraction of the theoretical full Kelly criterion used for sizing positions.',
    whyItMatters: 'Full Kelly (1.0) leads to massive account volatility. Quarter Kelly (0.25) keeps about 44% of full Kelly\'s growth rate with only 25% of its volatility.',
    ruleOfThumb: '0.20 - 0.25 (Quarter Kelly) is the institutional quantitative standard.',
    examples: '0.25 sizes positions conservatively based on expected mathematical edge.'
  },

  // --- SECTION 6: TRADE GEOMETRY & TARGETS ---
  atr_stop_multiplier: {
    key: 'atr_stop_multiplier',
    label: 'ATR Stop Multiplier',
    category: '6. Trade Geometry & Targets',
    formula: 'Stop Distance = ATR Stop Multiplier × 14-Day ATR',
    summary: 'Number of Average True Ranges used to place the stop loss below entry price. It also sets the broker-side trailing stop distance.',
    whyItMatters: 'Dynamic ATR stops adapt to current stock volatility—giving volatile stocks room to breathe while keeping tight stops on quiet stocks.',
    ruleOfThumb: '1.5 × ATR places the stop outside normal daily noise without taking excessive risk.',
    examples: 'If ATR is $2.00, a 1.5x multiplier sets the stop $3.00 below entry.'
  },
  target_rr_multiple: {
    key: 'target_rr_multiple',
    label: 'Target Risk/Reward Multiple',
    category: '6. Trade Geometry & Targets',
    formula: 'Profit Target = Entry + (Target RR Multiple × Stop Distance)',
    summary: 'Profit target expressed as a multiple of the initial risk (stop loss distance). No take-profit order is placed; the target is the reward assumption used in the EV and Kelly sizing math.',
    whyItMatters: 'Ensures asymmetric upside where winning trades make significantly more than losing trades lose.',
    ruleOfThumb: '2.0 (2:1 R:R) means risking $1 to make $2.',
    examples: 'With a $3.00 stop loss and 2.0 RR, the profit target is set $6.00 above entry.'
  }
};

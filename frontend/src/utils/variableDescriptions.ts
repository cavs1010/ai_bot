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
    summary: 'Number of calendar days before and after a corporate earnings announcement to avoid.',
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
    formula: 'Score = EMA Trend (1 pt) + RSI Momentum (1 pt) + Volume Confirmation (1 pt)',
    summary: 'Minimum technical composite score needed to qualify as a momentum candidate.',
    whyItMatters: 'Ensures candidates have multi-timeframe trend alignment, healthy relative strength, and above-average volume before deep intelligence gating.',
    ruleOfThumb: 'Score ≥ 2 filters out weak or contradictory momentum charts.',
    examples: 'Score 3/3 = EMA uptrend + RSI in sweet spot + Volume expanding.'
  },
  RSI_MIN: {
    key: 'RSI_MIN',
    label: 'RSI_MIN (14-Day)',
    category: '2. Momentum Scanner Thresholds',
    summary: 'Minimum Relative Strength Index value allowed for momentum entries.',
    whyItMatters: 'Ensures the stock is in active accumulation and not languishing in a downtrend or oversold bear trap.',
    ruleOfThumb: '50 - 55 ensures bullish momentum regime.',
    examples: 'RSI > 50 confirms bulls are in control on the daily timeframe.'
  },
  RSI_MAX: {
    key: 'RSI_MAX',
    label: 'RSI_MAX (14-Day)',
    category: '2. Momentum Scanner Thresholds',
    summary: 'Maximum Relative Strength Index value allowed before a stock is considered overbought.',
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
    examples: 'If AMD is scanning but Semiconductor ETF (SOXX) is down -3.1%, entry is blocked.'
  },
  premarket_gap_pct: {
    key: 'premarket_gap_pct',
    label: 'Premarket Gap Limit (%)',
    category: '3. Gate 1 Hard Stress Boundaries',
    summary: 'Maximum allowable premarket gap percentage from previous day\'s closing price.',
    whyItMatters: 'Large premarket gaps (>3-4%) frequently lead to aggressive gap-fade profit-taking at the opening bell.',
    ruleOfThumb: '3.0% - 4.0% limit protects from opening-bell slippage and instant reversals.',
    examples: 'A stock gapping up 6.5% premarket is skipped to avoid buying the open trap.'
  },

  // --- SECTION 4: LLM GATE & EDGE THRESHOLDS ---
  MIN_CONFIDENCE: {
    key: 'MIN_CONFIDENCE',
    label: 'Gate 3 Min AI Confidence (1 - 10)',
    category: '4. LLM Gate & Edge Thresholds',
    summary: 'Minimum directional confidence score required from the LLM News & Sentiment Analyst.',
    whyItMatters: 'Ensures trades are only taken when the AI has strong, unambiguous catalyst backing rather than neutral noise.',
    ruleOfThumb: '6 - 7 out of 10 ensures high conviction in narrative tailwinds.',
    examples: 'Score 8/10 = clear positive earnings beat, analyst upgrade, and product momentum.'
  },
  WIN_PROB_BASE: {
    key: 'WIN_PROB_BASE',
    label: 'WIN_PROB_BASE (%)',
    category: '4. LLM Gate & Edge Thresholds',
    summary: 'Baseline historical probability of success before applying AI intelligence adjustments.',
    whyItMatters: 'Serves as the conservative starting anchor in the expected value and Kelly position sizing formulas.',
    ruleOfThumb: '35.0% - 40.0% is a disciplined, conservative momentum baseline.',
    examples: 'Starting at 35%, strong AI sentiment can boost probability up to 55-65%.'
  },
  MIN_EDGE_PCT: {
    key: 'MIN_EDGE_PCT',
    label: 'MIN_EDGE_PCT (%)',
    category: '4. LLM Gate & Edge Thresholds',
    formula: 'EV = (Win Prob × Target %) - (Loss Prob × Stop Loss %)',
    summary: 'Minimum mathematical expected value (edge) required to approve a trade.',
    whyItMatters: 'Ensures only statistically positive-expectation trades receive capital allocation.',
    ruleOfThumb: '≥ 4.0% expected edge covers transaction fees, slippage, and execution friction.',
    examples: 'If EV is +5.2%, it passes the 4.0% minimum edge hurdle.'
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
    whyItMatters: 'If the total account drops by this percentage in a single trading day, all trading is automatically paused to stop catastrophic compounding losses.',
    ruleOfThumb: '2.0% - 3.0% of total portfolio equity.',
    examples: 'On a $100k account, a $3,000 intraday loss halts all new executions for the day.'
  },
  MAX_DRAWDOWN_PCT: {
    key: 'MAX_DRAWDOWN_PCT',
    label: 'MAX_DRAWDOWN_PCT (%)',
    category: '5. Risk & Position Sizing',
    summary: 'Peak-to-trough account drawdown safety limit.',
    whyItMatters: 'The ultimate survival metric for quantitative trading systems. Prevents deep capital destruction during prolonged adverse regimes.',
    ruleOfThumb: '6.0% - 10.0% max drawdown threshold.',
    examples: 'If account drops 8% from its high-water mark, risk sizing is drastically reduced or paused.'
  },
  KELLY_FRACTION: {
    key: 'KELLY_FRACTION',
    label: 'KELLY_FRACTION',
    category: '5. Risk & Position Sizing',
    formula: 'Fractional Kelly = Kelly Multiplier × ((Win% / Loss%) - ((1 - Win%) / Win%))',
    summary: 'Fraction of the theoretical full Kelly criterion used for sizing positions.',
    whyItMatters: 'Full Kelly (1.0) leads to massive account volatility. Fractional Kelly (0.25 = Quarter Kelly) captures 75% of growth with only 25% of the volatility.',
    ruleOfThumb: '0.20 - 0.25 (Quarter Kelly) is the institutional quantitative standard.',
    examples: '0.25 sizes positions conservatively based on expected mathematical edge.'
  },

  // --- SECTION 6: TRADE GEOMETRY & TARGETS ---
  atr_stop_multiplier: {
    key: 'atr_stop_multiplier',
    label: 'ATR Stop Multiplier',
    category: '6. Trade Geometry & Targets',
    formula: 'Stop Distance = ATR Stop Multiplier × 14-Day ATR',
    summary: 'Number of Average True Ranges used to place the stop loss below entry price.',
    whyItMatters: 'Dynamic ATR stops adapt to current stock volatility—giving volatile stocks room to breathe while keeping tight stops on quiet stocks.',
    ruleOfThumb: '1.5 × ATR places the stop outside normal daily noise without taking excessive risk.',
    examples: 'If ATR is $2.00, a 1.5x multiplier sets the stop $3.00 below entry.'
  },
  target_rr_multiple: {
    key: 'target_rr_multiple',
    label: 'Target Risk/Reward Multiple',
    category: '6. Trade Geometry & Targets',
    formula: 'Profit Target = Entry + (Target RR Multiple × Stop Distance)',
    summary: 'Profit target expressed as a multiple of the initial risk (stop loss distance).',
    whyItMatters: 'Ensures asymmetric upside where winning trades make significantly more than losing trades lose.',
    ruleOfThumb: '2.0 (2:1 R:R) means risking $1 to make $2.',
    examples: 'With a $3.00 stop loss and 2.0 RR, the profit target is set $6.00 above entry.'
  }
};

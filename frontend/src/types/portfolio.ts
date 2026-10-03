export interface LivePortfolioResponse {
  success: boolean;
  value?: number;
  daily_pnl?: number;
  daily_pnl_pct?: number;
  open_positions?: number;
  drawdown_pct?: number;
  error?: string;
}

export interface UniverseItem {
  ticker?: string;
  symbol?: string;
  sector?: string;
  price?: number;
  volume?: number;
  atr_pct?: number;
  rsi?: number;
  sma20?: number;
  sma50?: number;
  [key: string]: any;
}

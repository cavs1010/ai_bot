import pandas as pd

WATCHLIST_PATH = 'data/watchlist.csv'
TOP_N          = 15
MIN_SCORE      = 2


def load_watchlist() -> pd.DataFrame | None:
    """
    Reads the Tier 1 watchlist CSV produced by universe_filter.py.

    Returns:
        DataFrame with columns ticker, price, volume, atr, atr_pct, rsi, sma20, sma50,
        or None on failure.
    """
    try:
        df = pd.read_csv(WATCHLIST_PATH)
        print(f'[scanner] loaded {len(df)} stocks from {WATCHLIST_PATH}')
        return df
    except Exception as e:
        print(f'[scanner] failed to load watchlist: {e}')
        return None


def calculate_momentum_score(row: pd.Series) -> tuple[int, float]:
    """
    Scores a stock 0–3 based on three momentum criteria.

    Scoring (1 point each):
      1. RSI in [50, 70]  — momentum zone, not overbought
      2. price > sma20    — short-term uptrend
      3. sma20 > sma50    — bullish structure (golden-cross alignment)

    Args:
        row: DataFrame row with rsi, price, sma20, sma50, atr columns.

    Returns:
        Tuple of (score, atr).
    """
    score = 0
    if 50 <= row['rsi'] <= 70:
        score += 1
    if row['price'] > row['sma20']:
        score += 1
    if row['sma20'] > row['sma50']:
        score += 1
    return score, float(row['atr'])


def run_scan(min_score: int = MIN_SCORE) -> pd.DataFrame | None:
    """
    Runs the Tier 2 momentum scan on the Tier 1 watchlist.

    Loads watchlist.csv, scores each stock, filters to score >= min_score,
    and returns the top TOP_N candidates sorted by score descending.

    Args:
        min_score: Minimum momentum score (0–3) a stock must reach to be included.
                   Default is MIN_SCORE (2) — requiring at least two of three criteria met.

    Returns:
        DataFrame with columns ticker, price, score, atr, rsi, sma20, sma50,
        or None on failure.
    """
    df = load_watchlist()
    if df is None:
        return None

    scores = df.apply(calculate_momentum_score, axis=1)
    df['score'] = [s[0] for s in scores]

    candidates: pd.DataFrame = df.loc[df['score'] >= min_score].copy()
    print(f'[scanner] {len(candidates)} stocks with score >= {min_score}')

    candidates = candidates.sort_values(by='score', ascending=False).head(TOP_N)
    print(f'[scanner] returning top {len(candidates)} candidates')

    cols = ['ticker', 'price', 'score', 'atr', 'rsi', 'sma20', 'sma50']
    return candidates.loc[:, cols].reset_index(drop=True)


if __name__ == '__main__':
    result = run_scan()
    if result is not None:
        print(result.to_string(index=False))

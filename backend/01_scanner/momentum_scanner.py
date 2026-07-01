import sys
import pathlib
import pandas as pd

# Strategy dials live on the central board — backend/config.py.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))   # → backend/
from config import TOP_N, MIN_SCORE, RSI_MIN, RSI_MAX

WATCHLIST_PATH = 'data/watchlist.csv'   # plumbing path, not a strategy dial


def load_watchlist() -> pd.DataFrame | None:
    """
    Reads the Tier 1 watchlist CSV produced by universe_filter.py.

    Returns:
        DataFrame with columns ticker, price, volume, atr, atr_pct, rsi, sma20, sma50, sector,
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
    if RSI_MIN <= row['rsi'] <= RSI_MAX:
        score += 1
    if row['price'] > row['sma20']:
        score += 1
    if row['sma20'] > row['sma50']:
        score += 1
    return score, float(row['atr'])


def run_scan(min_score: int = MIN_SCORE, df: pd.DataFrame | None = None, top_n: int = TOP_N) -> pd.DataFrame | None:
    """
    Runs the Tier 2 momentum scan on a Tier 1 watchlist.

    Scores each stock, filters to score >= min_score, and returns the top top_n
    candidates sorted by score descending.

    Args:
        min_score: Minimum momentum score (0–3) a stock must reach to be included.
                   Default is MIN_SCORE (2) — requiring at least two of three criteria met.
        df: Pre-loaded watchlist DataFrame to score (must have the columns read by
            calculate_momentum_score). When None (default), the watchlist is loaded
            from WATCHLIST_PATH via load_watchlist(). Pass a DataFrame to score an
            in-memory watchlist without disk I/O. The input is not mutated.
        top_n: Maximum number of candidates to return. Default is TOP_N (15).

    Returns:
        DataFrame with columns ticker, price, score, atr, rsi, sma20, sma50, sector,
        or None when the watchlist cannot be loaded.
    """
    if df is None:
        df = load_watchlist()
    if df is None:
        return None

    df = df.copy()  # avoid mutating the caller's DataFrame when adding 'score'
    scores = df.apply(calculate_momentum_score, axis=1)
    df['score'] = [s[0] for s in scores]

    candidates: pd.DataFrame = df.loc[df['score'] >= min_score].copy()
    print(f'[scanner] {len(candidates)} stocks with score >= {min_score}')

    candidates = candidates.sort_values(by='score', ascending=False).head(top_n)
    print(f'[scanner] returning top {len(candidates)} candidates')

    cols = ['ticker', 'price', 'score', 'atr', 'rsi', 'sma20', 'sma50', 'sector']
    return candidates.loc[:, cols].reset_index(drop=True)


if __name__ == '__main__':
    result = run_scan()
    if result is not None:
        print(result.to_string(index=False))

    # Variation: scoring a pre-loaded DataFrame should match the disk-loaded path.
    watchlist = load_watchlist()
    if watchlist is not None:
        from_df = run_scan(df=watchlist)
        assert from_df is not None and from_df.equals(result)
        print('[scanner] run_scan(df=...) matches run_scan() ✅')

    capped = run_scan(top_n=5)
    assert capped is not None and len(capped) <= 5
    print('[scanner] run_scan(top_n=5) returned <= 5 rows ✅')

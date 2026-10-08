import sys
import pathlib
import pandas as pd

# Strategy settings come from the active Neon config, passed in by Node.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))   # → backend/
from strategy_config import TOP_N, MIN_SCORE, RSI_MIN, RSI_MAX


def calculate_momentum_score(row: pd.Series) -> tuple[int, float]:
    """
    Scores a stock 0–3 based on three momentum criteria.

    Scoring (1 point each):
      1. RSI in [RSI_MIN, RSI_MAX] — momentum zone, not overbought
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


def run_scan(df: pd.DataFrame, min_score: int = MIN_SCORE, top_n: int = TOP_N) -> pd.DataFrame:
    """
    Runs the Tier 2 momentum scan on a Tier 1 watchlist.

    Scores each stock, filters to score >= min_score, and returns the top top_n
    candidates sorted by score descending.

    Args:
        df: The universe to score: the rows of the latest Neon universe batch, passed in by
            the caller (must have the columns read by calculate_momentum_score). Not mutated.
        min_score: Minimum momentum score (0–3) a stock must reach to be included.
                   Default is MIN_SCORE from the active strategy config.
        top_n: Maximum number of candidates to return. Default is TOP_N from the active strategy config.

    Returns:
        DataFrame with columns ticker, price, score, atr, rsi, sma20, sma50, sector.
    """
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
    # Test: pipe a universe (JSON array of rows, as Node sends it) into stdin
    universe = pd.read_json(sys.stdin)
    result = run_scan(universe)
    print(result.to_string(index=False))

    capped = run_scan(universe, top_n=5)
    assert len(capped) <= 5
    print('[scanner] run_scan(top_n=5) returned <= 5 rows ✅')

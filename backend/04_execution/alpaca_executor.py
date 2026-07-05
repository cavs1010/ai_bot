# alpaca_executor.py — live Alpaca account state (portfolio value, positions, daily P&L)
# Phase 6 | Execution Layer (pulled forward for Phase 5 risk gate)
#
# Functions:
#   get_portfolio_value() -> float | None
#   get_open_positions()  -> list[dict] | None
#   get_daily_pnl()       -> float | None
#
# Test: python backend/04_execution/alpaca_executor.py

import os

from dotenv import load_dotenv

load_dotenv()


def _get_alpaca_client():
    """
    Builds an authenticated Alpaca REST client from .env credentials.

    Returns:
        alpaca_trade_api.REST client, or None if credentials are missing/invalid.
    """
    try:
        import alpaca_trade_api as tradeapi
        from alpaca_trade_api.common import URL

        key_id = os.getenv('ALPACA_API_KEY')
        secret_key = os.getenv('ALPACA_SECRET_KEY')
        base_url = os.getenv('ALPACA_BASE_URL')
        if not key_id or not secret_key or not base_url:
            raise ValueError('Alpaca credentials not set')
        return tradeapi.REST(key_id=key_id, secret_key=secret_key, base_url=URL(base_url))
    except Exception as e:
        print(f'[executor] Alpaca client unavailable: {e}')
        return None


def get_portfolio_value() -> float | None:
    """
    Fetches current total portfolio value (cash + positions) from Alpaca.

    Returns:
        Portfolio value in dollars, or None on failure.
    """
    api = _get_alpaca_client()
    if api is None:
        return None
    try:
        return float(api.get_account().portfolio_value)
    except Exception as e:
        print(f'[executor] get_portfolio_value failed: {e}')
        return None


def get_open_positions() -> list[dict] | None:
    """
    Fetches all currently open positions from Alpaca.

    Returns:
        List of dicts with keys: ticker, qty, market_value, unrealized_pl, current_price.
        Empty list if no positions are open. None on failure.
    """
    api = _get_alpaca_client()
    if api is None:
        return None
    try:
        positions = api.list_positions()
        return [
            {
                'ticker': p.symbol,
                'qty': float(p.qty),
                'market_value': float(p.market_value),
                'unrealized_pl': float(p.unrealized_pl),
                'current_price': float(p.current_price),
            }
            for p in positions
        ]
    except Exception as e:
        print(f'[executor] get_open_positions failed: {e}')
        return None


def get_daily_pnl() -> float | None:
    """
    Fetches today's realized + unrealized P&L (dollars) from Alpaca account state.

    Returns:
        Signed dollar P&L (equity − last_equity), or None on failure.
    """
    api = _get_alpaca_client()
    if api is None:
        return None
    try:
        account = api.get_account()
        return float(account.equity) - float(account.last_equity)
    except Exception as e:
        print(f'[executor] get_daily_pnl failed: {e}')
        return None


def get_drawdown_pct(period: str = '1M') -> float | None:
    """
    Computes current equity drawdown from its peak over the lookback period.

    Args:
        period: Alpaca portfolio-history lookback (e.g. '1M', '3M'). Default 1 month —
                long enough to catch a real peak, short enough that an old, unrelated
                high doesn't permanently pin the kill switch.

    Returns:
        Drawdown as a positive fraction (0.05 = 5% below peak), or None on failure.
    """
    api = _get_alpaca_client()
    if api is None:
        return None
    try:
        history = api.get_portfolio_history(period=period, timeframe='1D')
        equity = [e for e in history.equity if e]  # drop leading nulls (pre-account-open days)
        if not equity:
            raise ValueError('no equity history returned')
        peak = max(equity)
        current = equity[-1]
        return round(max(0.0, (peak - current) / peak), 4)
    except Exception as e:
        print(f'[executor] get_drawdown_pct failed: {e}')
        return None


if __name__ == '__main__':
    value = get_portfolio_value()
    if value is not None:
        print(f'[executor] portfolio value: ${value:,.2f}')
    else:
        print('[executor] get_portfolio_value returned None')

    positions = get_open_positions()
    if positions is not None:
        print(f'[executor] open positions: {len(positions)}')
        for p in positions:
            print(f"  {p['ticker']}: {p['qty']} shares, ${p['market_value']:,.2f}")
    else:
        print('[executor] get_open_positions returned None')

    pnl = get_daily_pnl()
    if pnl is not None:
        print(f'[executor] daily P&L: ${pnl:+,.2f}')
    else:
        print('[executor] get_daily_pnl returned None')

    drawdown = get_drawdown_pct()
    if drawdown is not None:
        print(f'[executor] drawdown from peak: {drawdown:.2%}')
    else:
        print('[executor] get_drawdown_pct returned None')

    # Failure path — bad credentials should return None, not raise
    os.environ['ALPACA_API_KEY'] = 'invalid'
    bad = get_portfolio_value()
    assert bad is None
    print('[executor] invalid credentials correctly returned None ✅')

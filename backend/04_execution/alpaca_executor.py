# alpaca_executor.py — Alpaca execution layer: live account state + order placement
# Phase 6 | Execution Layer

import os
import time
from dotenv import load_dotenv

load_dotenv()

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import (
    MarketOrderRequest,
    TrailingStopOrderRequest,
    GetPortfolioHistoryRequest,
)
from alpaca.trading.enums import OrderSide, TimeInForce


def _get_alpaca_client():
    """
    Builds an authenticated Alpaca REST client from environment credentials using alpaca-py.

    Returns:
        TradingClient instance, or raises an error if credentials are missing/invalid.
    """
    raw_key_id = os.getenv('ALPACA_API_KEY')
    raw_secret_key = os.getenv('ALPACA_SECRET_KEY')
    base_url = os.getenv('ALPACA_BASE_URL', 'https://paper-api.alpaca.markets')

    if not raw_key_id or not raw_secret_key:
        raise ValueError('Alpaca credentials missing in environment (ALPACA_API_KEY and ALPACA_SECRET_KEY must be set)')

    key_id = raw_key_id.strip().strip('"\'')
    secret_key = raw_secret_key.strip().strip('"\'')

    # Auto-detect paper trading if key starts with PK or paper is in base_url or ALPACA_PAPER is true
    is_paper_key = key_id.upper().startswith('PK')
    paper_env = os.getenv('ALPACA_PAPER', 'true').lower() == 'true'
    paper = is_paper_key or ('paper' in base_url.lower()) or paper_env

    try:
        return TradingClient(key_id, secret_key, paper=paper)
    except Exception as e:
        print(f'[executor] ❌ Failed to initialize Alpaca TradingClient: {e}')
        raise e


def get_portfolio_value() -> float:
    """
    Fetches current total portfolio value (cash + positions) from Alpaca.

    Returns:
        Portfolio value in dollars. Raises Exception on failure.
    """
    client = _get_alpaca_client()
    try:
        account = client.get_account()
        return float(account.portfolio_value)
    except Exception as e:
        print(f'[executor] ❌ get_portfolio_value failed: {e}')
        raise e


def get_open_positions() -> list[dict]:
    """
    Fetches all currently open positions from Alpaca.

    Returns:
        List of dicts with keys: ticker, qty, market_value, unrealized_pl, current_price.
        Raises Exception on failure.
    """
    client = _get_alpaca_client()
    try:
        positions = client.get_all_positions()
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
        print(f'[executor] ❌ get_open_positions failed: {e}')
        raise e


def get_daily_pnl() -> float:
    """
    Fetches today's realized + unrealized P&L (dollars) from Alpaca account state.

    Returns:
        Signed dollar P&L (equity − last_equity). Raises Exception on failure.
    """
    client = _get_alpaca_client()
    try:
        account = client.get_account()
        return float(account.equity) - float(account.last_equity)
    except Exception as e:
        print(f'[executor] ❌ get_daily_pnl failed: {e}')
        raise e


def get_drawdown_pct(period: str = '1M') -> float:
    """
    Computes current equity drawdown from its peak over the lookback period.

    Args:
        period: Alpaca portfolio-history lookback (e.g. '1M', '3M').

    Returns:
        Drawdown as a positive fraction (0.05 = 5% below peak). Raises Exception on failure.
    """
    client = _get_alpaca_client()
    try:
        req = GetPortfolioHistoryRequest(period=period, timeframe='1D')
        history = client.get_portfolio_history(req)
        equity = [float(e) for e in (history.equity or []) if e is not None]
        if not equity:
            raise ValueError('no equity history returned from Alpaca')
        peak = max(equity)
        current = equity[-1]
        return round(max(0.0, (peak - current) / peak), 4)
    except Exception as e:
        print(f'[executor] ❌ get_drawdown_pct failed: {e}')
        raise e


def position_trade(trade_details: dict, fill_timeout_s: int = 60, ignore_market_hours: bool = False) -> dict | None:
    """
    Places an entry order and attaches a native Alpaca trailing stop to protect it using alpaca-py.

    Args:
        trade_details: Required keys: 'ticker', 'shares', 'trade_levels' (with 'stop_pct').
        fill_timeout_s: Seconds to wait for fill.
        ignore_market_hours: If True, submits order even if Alpaca market clock indicates closed.

    Returns:
        Order audit dict.
    """
    ticker = trade_details.get('ticker')
    shares = trade_details.get('shares', 0)
    stop_pct = (trade_details.get('trade_levels') or {}).get('stop_pct')

    if not ticker or shares <= 0 or not stop_pct:
        print(f'[executor] {ticker or "?"}: nothing to place — shares={shares}, stop_pct={stop_pct}')
        return None

    client = _get_alpaca_client()

    clock = client.get_clock()
    if not clock.is_open:
        if not ignore_market_hours:
            print(f'[executor] {ticker}: market closed — not submitting (next open {clock.next_open})')
            return None
        else:
            print(f'[executor] {ticker}: market closed but ignore_market_hours=True — submitting order for market open (next open {clock.next_open})')

    is_market_closed = not clock.is_open

    trail_percent = round(stop_pct * 100, 2)  # stop_pct is a fraction; Alpaca wants a percent

    try:
        order_req = MarketOrderRequest(
            symbol=ticker,
            qty=shares,
            side=OrderSide.BUY,
            time_in_force=TimeInForce.DAY
        )
        entry = client.submit_order(order_req)
    except Exception as e:
        print(f'[executor] ❌ {ticker}: entry order rejected by Alpaca — {e}')
        raise RuntimeError(f"Alpaca entry order rejected for {ticker}: {e}") from e

    filled = _wait_for_fill(client, entry.id, fill_timeout_s, is_market_closed=is_market_closed)
    if filled is None:
        print(f'[executor] ❌ {ticker}: entry did not fill within {fill_timeout_s}s — cancelling')
        try:
            client.cancel_order_by_id(entry.id)
        except Exception as e:
            print(f'[executor] {ticker}: cancel of unfilled entry failed — {e}')
        raise RuntimeError(f"Alpaca entry order for {ticker} timed out waiting for fill")

    status_str = str(filled.status).lower().replace('orderstatus.', '')
    is_filled = (status_str == 'filled')
    filled_qty = int(float(filled.filled_qty)) if is_filled and filled.filled_qty else shares
    filled_price = float(filled.filled_avg_price) if is_filled and filled.filled_avg_price else None

    audit = {
        'ticker': ticker,
        'entry_order_id': str(filled.id),
        'status': status_str,
        'is_market_closed': is_market_closed,
        'filled_qty': filled_qty,
        'filled_avg_price': filled_price,
        'trail_percent': trail_percent,
        'stop_order_id': None,
        'stop_attached': False,
        'initial_stop_price': None,
        'hwm': None,
    }

    if not is_filled:
        if is_market_closed:
            print(f'[executor] {ticker}: order queued in state "{status_str}" ({shares} sh) for market open.')
        else:
            print(f'[executor] {ticker}: order working/placed on exchange in state "{status_str}" ({shares} sh).')
        return audit

    try:
        stop_req = TrailingStopOrderRequest(
            symbol=ticker,
            qty=filled_qty,
            side=OrderSide.SELL,
            trail_percent=trail_percent,
            time_in_force=TimeInForce.GTC
        )
        stop = client.submit_order(stop_req)
    except Exception as e:
        print(f'[executor] ❌ {ticker}: POSITION UNPROTECTED — entry filled ({filled_qty} sh) but trailing stop failed: {e}')
        raise RuntimeError(f"Trailing stop order failed for {ticker}: {e}") from e

    audit['stop_order_id'] = str(stop.id)
    audit['stop_attached'] = True
    audit['initial_stop_price'] = float(stop.stop_price) if getattr(stop, 'stop_price', None) else None
    audit['hwm'] = float(stop.hwm) if getattr(stop, 'hwm', None) else None

    print(f'[executor] {ticker}: {filled_qty} sh @ ${audit["filled_avg_price"]:,.2f}, trailing stop {trail_percent}%')
    return audit


def _wait_for_fill(client, order_id, timeout_s: int, is_market_closed: bool = False):
    """
    Polls an order until it fills. If market is closed, returns as soon as accepted/queued by broker.
    """
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        order = client.get_order_by_id(order_id)
        status_str = str(order.status).lower().replace('orderstatus.', '')
        if status_str == 'filled':
            return order
        if is_market_closed and status_str in ('accepted', 'new', 'pending_new', 'held', 'queued'):
            print(f'[executor] market closed: entry order accepted/queued by broker (status: {status_str})')
            return order
        if status_str in ('rejected', 'canceled', 'expired'):
            print(f'[executor] entry order {status_str}')
            return None
        time.sleep(1)
    return None


if __name__ == '__main__':
    print("Testing alpaca_executor.py with live Alpaca credentials...")
    pv = get_portfolio_value()
    print(f"Portfolio Value: ${pv:,.2f}")
    positions = get_open_positions()
    print(f"Open Positions count: {len(positions)}")
    pnl = get_daily_pnl()
    print(f"Daily PnL: ${pnl:+,.2f}")
    dd = get_drawdown_pct()
    print(f"Drawdown: {dd:.2%}")


# alpaca_executor.py — Alpaca execution layer: live account state + order placement
# Phase 6 | Execution Layer
#
# Functions:
#   get_portfolio_value() -> float | None
#   get_open_positions()  -> list[dict] | None
#   get_daily_pnl()       -> float | None
#   get_drawdown_pct()    -> float | None
#   position_trade()      -> dict | None
#
# Test: python backend/04_execution/alpaca_executor.py

import os
import time

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


def position_trade(trade_details: dict, fill_timeout_s: int = 60) -> dict | None:
    """
    Places an entry order and attaches a native Alpaca trailing stop to protect it.

    Two orders, not a bracket: Alpaca supports trailing stops only as single orders, so the
    stop is submitted separately once the entry fills. Alpaca then ratchets the stop against
    the high-water mark broker-side — there is no monitoring loop to run.

    The trail is derived from the same ATR stop distance that Gate 5's EV and the risk gate's
    Kelly sizing were computed from (`trade_levels['stop_pct']`), so the order placed in the
    market describes the same trade that was authorised.

    Market must be open. Outside regular hours a market order sits as `accepted` (queued, not
    filled), so this function refuses to submit when Alpaca's clock says closed.

    Args:
        trade_details: Required keys:
            'ticker'       (str)  — symbol to buy.
            'shares'       (int)  — share count from the risk gate (position['shares']).
            'trade_levels' (dict) — Gate 5 levels; must contain 'stop_pct', a fraction
                                    (0.0211 → a 2.11% trail).
        fill_timeout_s: Seconds to wait for the entry to fill before giving up and cancelling
                        it. Default 60 — a market order in regular hours fills in seconds, so
                        a longer wait means the order is not going to fill.

    Returns:
        Order audit dict with keys:
            ticker, entry_order_id, filled_qty, filled_avg_price, trail_percent,
            stop_order_id, stop_attached, initial_stop_price, hwm
        None when no position was opened — bad input, no client, market closed, entry
        rejected, or entry never filled (the unfilled entry is cancelled in that case).

        If the entry FILLS but the trailing stop fails to attach, returns the audit with
        stop_attached=False — never None. A None return must always mean "no position
        exists", so an open but unprotected position stays visible to the caller.
    """
    ticker = trade_details.get('ticker')
    shares = trade_details.get('shares', 0)
    stop_pct = (trade_details.get('trade_levels') or {}).get('stop_pct')

    if not ticker or shares <= 0 or not stop_pct:
        print(f'[executor] {ticker or "?"}: nothing to place — shares={shares}, stop_pct={stop_pct}')
        return None

    api = _get_alpaca_client()
    if api is None:
        return None

    clock = api.get_clock()
    if not clock.is_open:
        print(f'[executor] {ticker}: market closed — not submitting (next open {clock.next_open})')
        return None

    trail_percent = round(stop_pct * 100, 2)  # stop_pct is a fraction; Alpaca wants a percent

    try:
        entry = api.submit_order(
            symbol=ticker, qty=shares, side='buy', type='market', time_in_force='day'
        )
    except Exception as e:
        print(f'[executor] {ticker}: entry order rejected — {e}')
        return None

    filled = _wait_for_fill(api, entry.id, fill_timeout_s)
    if filled is None:
        print(f'[executor] {ticker}: entry did not fill within {fill_timeout_s}s — cancelling')
        try:
            api.cancel_order(entry.id)
        except Exception as e:
            print(f'[executor] {ticker}: cancel of unfilled entry failed — {e}')
        return None

    filled_qty = int(float(filled.filled_qty))
    audit = {
        'ticker': ticker,
        'entry_order_id': str(entry.id),
        'filled_qty': filled_qty,
        'filled_avg_price': float(filled.filled_avg_price),
        'trail_percent': trail_percent,
        'stop_order_id': None,
        'stop_attached': False,
        'initial_stop_price': None,
        'hwm': None,
    }

    try:
        # 'gtc', not 'day': Alpaca allows only those two for trailing stops, and 'day' would
        # cancel the stop at the close and leave the position unprotected overnight.
        stop = api.submit_order(
            symbol=ticker, qty=filled_qty, side='sell', type='trailing_stop',
            trail_percent=str(trail_percent), time_in_force='gtc',
        )
    except Exception as e:
        print(f'[executor] {ticker}: POSITION UNPROTECTED — entry filled ({filled_qty} sh) '
              f'but trailing stop failed: {e}')
        return audit

    audit['stop_order_id'] = str(stop.id)
    audit['stop_attached'] = True
    audit['initial_stop_price'] = float(stop.stop_price) if stop.stop_price else None
    audit['hwm'] = float(stop.hwm) if stop.hwm else None

    print(f'[executor] {ticker}: {filled_qty} sh @ ${audit["filled_avg_price"]:,.2f}, '
          f'trailing stop {trail_percent}%')
    return audit


def _wait_for_fill(api, order_id: str, timeout_s: int):
    """
    Polls an order until it fills.

    Args:
        api: Authenticated Alpaca REST client.
        order_id: Order to poll.
        timeout_s: Give up after this many seconds.

    Returns:
        The filled order object, or None if it timed out or reached a terminal
        non-filled state (rejected, canceled, expired).
    """
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        order = api.get_order(order_id)
        if order.status == 'filled':
            return order
        if order.status in ('rejected', 'canceled', 'expired'):
            print(f'[executor] entry order {order.status}')
            return None
        time.sleep(1)
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

    # position_trade — refuses to submit when the market is closed (queued `accepted`
    # orders never fill inside fill_timeout).
    client = _get_alpaca_client()
    # stop_pct 0.0211 is the NVDA reference candidate (price 875.50, atr 12.30):
    # 1.5 × 12.30 / 875.50 → a 2.11% trail, not the flat 1.5% the roadmap first assumed.
    audit = position_trade({
        'ticker': 'AAPL',
        'shares': 1,
        'trade_levels': {'stop_pct': 0.0211},
    })
    if audit:
        print(f'[executor] audit: {audit}')
        assert audit['trail_percent'] == 2.11, 'stop_pct must convert to a percent'
        assert audit['stop_attached'], 'entry filled but trailing stop did not attach'
        print('[executor] entry + trailing stop placed ✅')

        client.cancel_all_orders()
        client.close_position(audit['ticker'])
        print(f'[executor] cleaned up test position in {audit["ticker"]}')
    else:
        print('[executor] position_trade returned None '
              '(market closed, or entry did not fill — expected outside RTH)')

    # Failure path — no shares to place should return None before any order is sent
    nothing = position_trade({'ticker': 'AAPL', 'shares': 0, 'trade_levels': {'stop_pct': 0.0211}})
    assert nothing is None
    print('[executor] zero shares correctly returned None ✅')

    # Failure path — bad credentials should return None, not raise
    os.environ['ALPACA_API_KEY'] = 'invalid'
    bad = get_portfolio_value()
    assert bad is None
    print('[executor] invalid credentials correctly returned None ✅')

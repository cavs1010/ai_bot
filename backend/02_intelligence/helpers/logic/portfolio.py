# helpers/logic/portfolio.py — daily loss limit check (pure calculation, no API)
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 screen_gate1_hard_threats()
#
# Functions:
#   check_daily_loss_limit(portfolio_value, daily_pnl, limit_pct=0.03)
#       → {breached: bool, loss_pct: float}
#
# Test: python backend/02_intelligence/helpers/portfolio.py


def check_daily_loss_limit(
    portfolio_value: float,
    daily_pnl: float,
    limit_pct: float = 0.03,
) -> dict:
    """
    Checks whether the portfolio has exceeded its daily loss limit.

    Args:
        portfolio_value: Total portfolio value at start of day (dollars). Must be > 0.
        daily_pnl:       Realized + unrealized P&L for the current session (dollars,
                         negative = loss, positive = gain).
        limit_pct:       Maximum tolerated daily loss as a fraction of portfolio value.
                         Default 0.03 (3%).

    Returns:
        dict with keys:
            breached (bool)  — True if loss limit has been exceeded.
            loss_pct (float) — Signed loss fraction (e.g. -0.025 = down 2.5%).
    """
    loss_pct = round(daily_pnl / portfolio_value, 4) if portfolio_value != 0 else 0.0
    return {
        'breached': loss_pct <= -limit_pct,  # exactly at limit = blocked (conservative hard stop)
        'loss_pct': loss_pct,
    }


if __name__ == '__main__':
    # Normal loss — well within 3% limit
    r = check_daily_loss_limit(100_000, -2_000)
    assert r['breached'] is False
    assert r['loss_pct'] == -0.02
    print(f'[portfolio] -2% loss:  breached={r["breached"]}, loss_pct={r["loss_pct"]:+.2%}')

    # Exactly at the limit — must be blocked (≤, not <)
    r = check_daily_loss_limit(100_000, -3_000)
    assert r['breached'] is True
    assert r['loss_pct'] == -0.03
    print(f'[portfolio] -3% loss:  breached={r["breached"]}, loss_pct={r["loss_pct"]:+.2%}')

    # Over the limit
    r = check_daily_loss_limit(100_000, -4_500)
    assert r['breached'] is True
    print(f'[portfolio] -4.5% loss: breached={r["breached"]}, loss_pct={r["loss_pct"]:+.2%}')

    # Gain — never blocked
    r = check_daily_loss_limit(100_000, 1_500)
    assert r['breached'] is False
    assert r['loss_pct'] > 0
    print(f'[portfolio] +1.5% gain: breached={r["breached"]}, loss_pct={r["loss_pct"]:+.2%}')

    print('[portfolio] all checks passed ✅')

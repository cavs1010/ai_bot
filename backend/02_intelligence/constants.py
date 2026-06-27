# constants.py — thresholds and maps shared across multiple gates
# Phase 4 | Intelligence Layer

# ---------------------------------------------------------------------------
# SECTOR_ETF_MAP: TradingView sector name → SPDR Select Sector ETF ticker
# Keys are the exact strings returned by the TradingView screener (not GICS).
# Used by: get_sector_etf_snapshot(), Gate 1, Gate 4
# ---------------------------------------------------------------------------
SECTOR_ETF_MAP: dict[str, str] = {
    "Commercial Services":    "XLI",   # business services → Industrials
    "Communications":         "XLC",   # → Communication Services
    "Consumer Durables":      "XLY",   # autos, appliances → Consumer Discretionary
    "Consumer Non-Durables":  "XLP",   # food, beverages → Consumer Staples
    "Consumer Services":      "XLY",   # restaurants, hotels → Consumer Discretionary
    "Electronic Technology":  "XLK",   # semiconductors, hardware → Technology
    "Energy Minerals":        "XLE",   # → Energy
    "Finance":                "XLF",   # → Financials
    "Health Services":        "XLV",   # hospitals, managed care → Health Care
    "Health Technology":      "XLV",   # biotech, devices → Health Care
    "Industrial Services":    "XLI",   # → Industrials
    "Non-Energy Minerals":    "XLB",   # metals, mining → Materials
    "Process Industries":     "XLB",   # chemicals, paper → Materials
    "Producer Manufacturing": "XLI",   # machinery, aerospace → Industrials
    "Retail Trade":           "XLY",   # → Consumer Discretionary
    "Technology Services":    "XLK",   # software, IT services → Technology
    "Transportation":         "XLI",   # airlines, logistics → Industrials (closest)
    "Utilities":              "XLU",   # → Utilities
}

# ---------------------------------------------------------------------------
# BLOCK_THRESHOLDS: numeric limits for Gate 1 block rules
# Used by: Gate 1 run()
# ---------------------------------------------------------------------------
BLOCK_THRESHOLDS: dict[str, float] = {
    'vix_level':          30.0,   # CBOE fear threshold; VIX at or above this = elevated fear
    'spy_change_pct':    -0.015,  # SPY down > 1.5% on the day = broad market stress
    'sector_change_pct': -0.02,   # sector ETF down > 2% on the day = sector-specific stress
    'premarket_gap_pct':  0.03,   # |gap| ≥ 3% before open = price instability
    'macro_hours':         2.0,   # high-impact event within 2 hours = imminent risk
    'loss_limit_pct':      0.03,  # portfolio down ≥ 3% today = hard stop
}

# ---------------------------------------------------------------------------
# SOURCE_RELIABILITY_TIERS: substring patterns → reliability tier
# Matched case-insensitively against source name and URL (Alpaca URL fallback).
# Order of tiers is enforced in classify_source(): DANGEROUS → HIGH → MEDIUM → LOW.
# Unknown sources default to LOW (doc §3.4: "unknown blogs").
# Used by: classify_source(), Gates 2 & 3
# ---------------------------------------------------------------------------
SOURCE_RELIABILITY_TIERS: dict[str, list[str]] = {
    'DANGEROUS': [
        'penny stock', 'pump', 'dump', 'anonymous', 'unverified',
        'telegram', 'discord', 'hotstock', 'investorshub',
        'reddit.com/r/pennystocks', 'stocktwits.com/message',
    ],
    'HIGH': [
        'reuters', 'bloomberg', 'wsj', 'wall street journal',
        'financial times', 'ft.com', 'associated press', 'ap news',
        'apnews.com', 'benzinga',
    ],
    'MEDIUM': [
        'cnbc', 'marketwatch', 'seeking alpha', 'motley fool', 'fool.com',
        'finnhub', 'yahoo', 'finance.yahoo', 'barrons', 'investing.com',
        'thestreet', 'zacks', 'tipranks', 'nasdaq.com/news',
        'business insider', 'insider.com',
    ],
    'LOW': [
        'press release', 'business wire', 'globenewswire', 'pr newswire',
        'accesswire', 'stocktwits', 'reddit', 'blog', 'medium.com',
        'substack', 'investor relations', 'ir.', '/newsroom',
        'prnewswire', 'company announcement',
    ],
}

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
# MACRO_EVENT_KEYWORDS: substrings matched case-insensitively against Finnhub
# economic calendar event names. Only US high-impact events that also contain
# one of these keywords are treated as market-moving.
# Used by: get_upcoming_macro_events(), get_hours_to_next_macro_event()
# ---------------------------------------------------------------------------
MACRO_EVENT_KEYWORDS: list[str] = [
    "FOMC",              # FOMC Minutes, FOMC Statement, FOMC Meeting
    "Fed Funds",         # Fed Funds Rate decision
    "Interest Rate",     # catches rate decisions from any Fed label variant
    "CPI",               # Consumer Price Index (headline + core)
    "Nonfarm",           # Nonfarm Payrolls (NFP)
    "Non Farm",          # alternate spelling
    "PCE",               # Core PCE Price Index (Fed's preferred inflation gauge)
    "GDP",               # GDP Growth Rate
    "PPI",               # Producer Price Index
    "Retail Sales",      # monthly consumer spending read
    "Unemployment Rate", # monthly unemployment print
    "Durable Goods",     # Durable Goods Orders
]

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
# SOURCE_RELIABILITY_TIERS: publisher → reliability tier
# Used by: classify_source(), Gates 2 & 3
# ---------------------------------------------------------------------------
SOURCE_RELIABILITY_TIERS: dict[str, list[str]] = {}  # TODO: populate

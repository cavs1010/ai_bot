# constants.py — REFERENCE MAPS shared across multiple gates
# Phase 4 | Intelligence Layer
#
# This file holds lookup tables (mappings), NOT tunable strategy dials.
# Every number you adjust based on trading decisions lives on the central board:
#   backend/config.py
# (BLOCK_THRESHOLDS and TRADE_LEVEL_PARAMS moved there.)

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

# NOTE: BLOCK_THRESHOLDS (Gate 1) and TRADE_LEVEL_PARAMS (Gate 5 / Phase 5) used to
# live here. They are tunable dials, so they now live on the board: backend/config.py.

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

# constants.py — thresholds and maps shared across multiple gates
# Phase 4 | Intelligence Layer

# ---------------------------------------------------------------------------
# SECTOR_ETF_MAP: GICS sector name → ETF ticker
# Used by: get_sector_etf_snapshot(), Gate 1, Gate 4
# ---------------------------------------------------------------------------
SECTOR_ETF_MAP: dict[str, str] = {}  # TODO: populate

# ---------------------------------------------------------------------------
# BLOCK_THRESHOLDS: numeric limits for Gate 1 block rules
# Used by: Gate 1 run()
# ---------------------------------------------------------------------------
BLOCK_THRESHOLDS: dict[str, float] = {}  # TODO: populate

# ---------------------------------------------------------------------------
# SOURCE_RELIABILITY_TIERS: publisher → reliability tier
# Used by: classify_source(), Gates 2 & 3
# ---------------------------------------------------------------------------
SOURCE_RELIABILITY_TIERS: dict[str, list[str]] = {}  # TODO: populate

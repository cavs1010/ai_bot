# helpers/news.py — fetch, classify, and format news headlines
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Pipeline (fetch once), Gate 2 run(), Gate 3 run()
#
# Functions:
#   classify_source(source_name)                    → 'HIGH' | 'MEDIUM' | 'LOW' | 'DANGEROUS'
#   fetch_headlines(ticker, days_back=2, max_results=5)
#       → [{headline, source, reliability, url, published_at}] | None
#   format_headlines_for_claude(headlines)          → str
#
# Sources: Alpaca News (primary) → Finnhub (supplementary) → NewsAPI (fallback)
#
# Test: python backend/02_intelligence/helpers/news.py

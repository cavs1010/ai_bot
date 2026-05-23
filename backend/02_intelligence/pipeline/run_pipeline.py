# pipeline/run_pipeline.py — Pipeline Orchestrator (wiring only, no Claude)
# Phase 4.6 | Intelligence Layer
#
# Function: run_pipeline(candidate, portfolio_value, daily_pnl)
#   → {ticker, gates: {gate1..gate5}, final_decision}
#
# final_decision values: 'BUY' | 'SKIP' | 'BLOCKED_G1' | 'BLOCKED_G2' | 'BLOCKED_G3' | 'BLOCKED_G4' | 'FLAGGED_FOR_REVIEW'
#
# Flow:
#   1. Gate 1 run()
#   2. If pass → fetch_headlines(ticker)  ← called once here, shared with Gates 2 & 3
#   3. Gate 2 run(headlines)
#   4. Gate 3 run(same headlines)
#   5. Gate 4 run(candidate, gate3_result)
#   6. Gate 5 run(candidate, all gate_results)
#   Stop on first failure.
#
# Test: python backend/02_intelligence/pipeline/run_pipeline.py

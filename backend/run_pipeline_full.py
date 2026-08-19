#!/usr/bin/env python3
# backend/run_pipeline_full.py — Production-grade end-to-end pipeline runner
#
# Runs the entire trading pipeline end-to-end and outputs structured JSON.
# Can be run directly from terminal: python3 backend/run_pipeline_full.py

import sys
import os
import pathlib
import json
import argparse
import pandas as pd
from datetime import datetime

# Define paths
backend_dir = pathlib.Path(__file__).resolve().parent
scanner_dir      = backend_dir / '01_scanner'
intelligence_dir = backend_dir / '02_intelligence'
risk_dir         = backend_dir / '03_risk'
exec_dir         = backend_dir / '04_execution'

# Append to sys.path for bare-name imports
for p in [
    backend_dir,                                  # → config.py
    scanner_dir,                                  # → universe_filter, momentum_scanner
    intelligence_dir,                             # → constants, helpers/*
    risk_dir,                                     # → risk_gate
    exec_dir,                                     # → alpaca_executor
    intelligence_dir / 'gate1_hard_threat',
    intelligence_dir / 'gate2_news_threat',
    intelligence_dir / 'gate3_sentiment',
    intelligence_dir / 'gate4_contradiction',
    intelligence_dir / 'gate5_signal',
]:
    p_str = str(p)
    if p_str not in sys.path:
        sys.path.insert(0, p_str)

# Import our modular strategy elements
import config
import universe_filter
import momentum_scanner
from universe_filter import run_universe_filter
from momentum_scanner import run_scan
from hard_threat_gate1 import get_shared_market_data, screen_gate1_hard_threats
from news_threat_gate2 import assess_gate2_news_threat
from sentiment_gate3 import evaluate_gate3_sentiment
from contradiction_gate4 import detect_gate4_contradiction
from signal_gate5 import decide_gate5_signal
from risk_gate import validate_trade
from alpaca_executor import (
    get_portfolio_value,
    get_open_positions,
    get_daily_pnl,
    get_drawdown_pct,
    position_trade,
)
from helpers.fetchers.news import fetch_news
from helpers.fetchers.market import get_market_context

# Re-point the cwd-relative watchlist paths at the real file
UNIVERSE_PATH = str(scanner_dir / 'data' / 'universe.json')
WATCHLIST_PATH = UNIVERSE_PATH
universe_filter.WATCHLIST_PATH = WATCHLIST_PATH
momentum_scanner.WATCHLIST_PATH = WATCHLIST_PATH

def print_log(msg: str):
    """Prints immediately to stdout with flushing so Express/Vite streams it in real-time."""
    print(msg, flush=True)

def main():
    parser = argparse.ArgumentParser(description="Run the entire stock-selection pipeline.")
    parser.add_argument('--run-universe', action='store_true', help="Force rebuild of universe.json (Stage 1)")
    parser.add_argument('--place-orders', action='store_true', help="Place actual paper orders on Alpaca if approved")
    parser.add_argument('--ignore-market-hours', action='store_true', help="Place orders even when Alpaca market clock is closed")
    parser.add_argument('--live-portfolio', action='store_true', help="Use live Alpaca portfolio metrics if available")
    args = parser.parse_args()

    print_log("=== STARTING TRADING BOT PIPELINE RUN ===")
    
    # 1. Stage 1 — Universe Filter
    run_universe = args.run_universe or not os.path.exists(UNIVERSE_PATH)
    if run_universe:
        print_log("[universe] Rebuilding universe.json (Stage 1 weekly filter)...")
        try:
            count = run_universe_filter(max_price=400.0)
            print_log(f"[universe] Success: Regenerated universe with {count} liquid stocks.")
        except Exception as e:
            print_log(f"[universe] Error running universe filter: {e}")
    else:
        print_log("[universe] Skipping Stage 1. Reading existing universe.json.")

    # Load and scan the watchlist
    if not os.path.exists(UNIVERSE_PATH):
        # Fallback to watchlist.csv if universe.json is missing
        csv_fallback = str(scanner_dir / 'data' / 'watchlist.csv')
        if os.path.exists(csv_fallback):
            UNIVERSE_PATH_TO_READ = csv_fallback
        else:
            print_log("[error] universe.json does not exist and could not be generated. Aborting.")
            sys.exit(1)
    else:
        UNIVERSE_PATH_TO_READ = UNIVERSE_PATH

    try:
        if UNIVERSE_PATH_TO_READ.endswith('.json'):
            universe_df = pd.read_json(UNIVERSE_PATH_TO_READ)
        else:
            universe_df = pd.read_csv(UNIVERSE_PATH_TO_READ)
        print_log(f"[universe] Loaded {len(universe_df)} stocks from {os.path.basename(UNIVERSE_PATH_TO_READ)}")
    except Exception as e:
        print_log(f"[error] Failed to load universe: {e}")
        sys.exit(1)

    # 2. Stage 2 — Momentum Scanner
    print_log("[scanner] Running Stage 2 (Momentum Scanner)...")
    try:
        candidates_df = run_scan()
        if candidates_df is None or candidates_df.empty:
            print_log("[scanner] No candidates met momentum score criteria. Aborting.")
            candidates_df = pd.DataFrame()
        else:
            print_log(f"[scanner] Found {len(candidates_df)} candidates with momentum score >= {config.MIN_SCORE}")
    except Exception as e:
        print_log(f"[scanner] Error scanning watchlist: {e}")
        candidates_df = pd.DataFrame()

    # 3. Setup Portfolio Context & Fetch Shared Market-Wide Data
    portfolio_value = 100_000.0
    daily_pnl = 0.0
    open_positions_count = 0
    drawdown_pct = 0.0
    
    use_live_portfolio = args.live_portfolio or getattr(config, 'USE_LIVE_PORTFOLIO', False)
    place_orders = args.place_orders or getattr(config, 'PLACE_ORDERS', False)
    ignore_market_hours = args.ignore_market_hours or getattr(config, 'IGNORE_MARKET_HOURS', False)

    if use_live_portfolio:
        print_log("[portfolio] Querying live Alpaca account...")
        try:
            portfolio_value = get_portfolio_value()
            live_positions = get_open_positions()
            daily_pnl = get_daily_pnl()
            drawdown_pct = get_drawdown_pct()
            open_positions_count = len(live_positions) if live_positions is not None else 0

            print_log(f"[portfolio] Live metrics: PV=${portfolio_value:,.2f}, PnL=${daily_pnl:+,.2f}, Open={open_positions_count}, DD={drawdown_pct:.2%}")
        except Exception as e:
            print_log(f"[portfolio] ❌ CRITICAL ALPACA API ERROR: Failed to fetch live portfolio metrics from Alpaca!")
            print_log(f"[portfolio] ❌ Error details: {e}")
            raise RuntimeError(f"Alpaca API connection failed: {e}") from e
    else:
        print_log("[portfolio] Using simulated sandbox portfolio limits ($100k account, 0 positions).")

    print_log("[gate1] Fetching market-wide shared indexes (SPY, VIX, Macro Calendar)...")
    try:
        shared = get_shared_market_data()
        print_log(f"[gate1] Shared Market Data: VIX={shared.get('vix', {}).get('level')}, SPY change={shared.get('spy', {}).get('change_pct_today'):.2%}, Macro Hours={shared.get('macro_hours')}")
    except Exception as e:
        print_log(f"[gate1] Error fetching shared market data, using conservative fallback defaults: {e}")
        shared = {
            'vix': {'level': 18.0, 'change_pct_today': 0.0, 'prior_close': 18.0},
            'spy': {'price': 500.0, 'change_pct_today': 0.0, 'prior_close': 500.0},
            'macro_hours': 24.0
        }

    # 4. Processing candidates through Gates 1-5, Risk Gate, and Execution
    rows = []
    processed_count = 0
    top_n_limit = getattr(config, 'TOP_N', 10)

    def emit_candidate_update(ticker: str, delta: dict):
        payload = {"ticker": ticker, **delta}
        print_log(f"__CANDIDATE_UPDATE__ {json.dumps(payload)}")

    def _row(ticker, decision, g3=None, g5=None, risk=None, exec_audit=None, exec_error=None):
        tl = g5.get('trade_levels') if g5 else None
        pos = risk['position'] if risk else None
        return {
            'ticker': ticker,
            'final_decision': decision,
            'g3_direction': g3.get('direction') if g3 else None,
            'g3_confidence': g3.get('confidence') if g3 else None,
            'ev': round(g5['expected_value'], 3) if g5 else None,
            'win_prob': round(g5['win_probability'], 3) if g5 else None,
            'position_confidence': g5['position_confidence'] if g5 else None,
            'entry': tl['entry'] if tl else None,
            'stop': tl['stop'] if tl else None,
            'target': tl['target'] if tl else None,
            'reward_risk': tl['reward_risk'] if tl else None,
            'shares': pos['shares'] if pos else None,
            'position_value': pos['position_value'] if pos else None,
            'position_pct': pos['position_pct'] if pos else None,
            'risk_reject': risk.get('reject_reason') if risk and not risk['approved'] else None,
            'exec_error': exec_error,
            'filled_qty': exec_audit.get('filled_qty') if exec_audit else None,
            'filled_avg_price': exec_audit.get('filled_avg_price') if exec_audit else None,
            'trail_percent': exec_audit.get('trail_percent') if exec_audit else None,
            'stop_attached': exec_audit.get('stop_attached') if exec_audit else None,
        }

    if not candidates_df.empty:
        for _, r in candidates_df.iterrows():
            if processed_count >= top_n_limit:
                break
            
            ticker = str(r['ticker'])
            sector = r['sector']
            
            if not isinstance(sector, str):
                print_log(f"[gate1] {ticker} skipped — no sector mapping found in watchlist.")
                continue

            processed_count += 1
            print_log(f"[pipeline] processing candidate {processed_count}: {ticker} (Sector: {sector}, Price: ${r['price']:.2f})")
            emit_candidate_update(ticker, {
                "final_decision": "EVALUATING...",
                "notes": f"Processing candidate {processed_count}: {ticker}"
            })

            candidate = {
                'ticker': ticker,
                'sector': sector,
                'price': float(r['price']),
                'atr': float(r['atr']),
                'score': int(r['score']),
            }

            # Gate 1 — Hard Threat Screen
            g1 = screen_gate1_hard_threats(candidate, shared, portfolio_value, daily_pnl)
            if not g1['passed']:
                reason = g1.get('block_reason', 'unknown')
                decision = f"BLOCKED_G1:{reason}"
                print_log(f"[gate1] {ticker}: BLOCKED — reason: {reason}")
                emit_candidate_update(ticker, {
                    "final_decision": decision,
                    "notes": f"Gate 1: {reason}"
                })
                rows.append(_row(ticker, decision))
                continue
            print_log(f"[gate1] {ticker}: Passed hard threat rules.")
            emit_candidate_update(ticker, {
                "final_decision": "PASSED_G1",
                "notes": "Gate 1 passed"
            })

            # Gate 2 & 3 News Fetch and Evaluation
            print_log(f"[gate2] Fetching recent news headlines for {ticker}...")
            headlines = fetch_news(ticker) or []
            print_log(f"[gate2] Fetched {len(headlines)} headlines.")

            g2 = assess_gate2_news_threat(candidate, headlines)
            if not g2['passed']:
                print_log(f"[gate2] {ticker}: BLOCKED — catastrophic news event flagged by Claude.")
                emit_candidate_update(ticker, {
                    "final_decision": "BLOCKED_G2",
                    "notes": "Gate 2 news block: catastrophic news event flagged"
                })
                rows.append(_row(ticker, "BLOCKED_G2"))
                continue
            print_log(f"[gate2] {ticker}: Passed news safety checks.")
            emit_candidate_update(ticker, {
                "final_decision": "PASSED_G2",
                "notes": "Gate 2 passed"
            })

            # Gate 3 — Sentiment Analysis (Claude)
            print_log(f"[gate3] Running AI sentiment analyzer on {ticker}...")
            g3 = evaluate_gate3_sentiment(candidate, headlines)
            if not g3['passed']:
                print_log(f"[gate3] {ticker}: BLOCKED — Sentiment direction is NEUTRAL/BEARISH or confidence low ({g3.get('confidence')}/10).")
                emit_candidate_update(ticker, {
                    "final_decision": "BLOCKED_G3",
                    "g3_direction": g3.get('direction'),
                    "g3_confidence": g3.get('confidence'),
                    "notes": f"Gate 3 AI sentiment block: {g3.get('direction')} ({g3.get('confidence')}/10)"
                })
                rows.append(_row(ticker, "BLOCKED_G3", g3=g3))
                continue
            print_log(f"[gate3] {ticker}: Passed. AI Sentiment: {g3.get('direction')} (Confidence: {g3.get('confidence')}/10)")
            emit_candidate_update(ticker, {
                "final_decision": "PASSED_G3",
                "g3_direction": g3.get('direction'),
                "g3_confidence": g3.get('confidence'),
                "notes": f"Gate 3 passed ({g3.get('direction')}, {g3.get('confidence')}/10)"
            })

            # Gate 4 — Contradiction Check (Claude)
            print_log(f"[gate4] Loading market backdrop for contradiction analysis...")
            market_context = get_market_context(sector)
            if market_context is None:
                print_log(f"[gate4] {ticker}: BLOCKED — unable to fetch market backdrop metrics.")
                emit_candidate_update(ticker, {
                    "final_decision": "BLOCKED_G4:no_market_context",
                    "notes": "Gate 4 blocked: unable to fetch market context"
                })
                rows.append(_row(ticker, "BLOCKED_G4:no_market_context", g3=g3))
                continue

            g4 = detect_gate4_contradiction(candidate, g3, market_context)
            if g4['action'] == 'BLOCK':
                print_log(f"[gate4] {ticker}: BLOCKED — direct market-vs-stock contradiction found: {g4.get('reason')}")
                emit_candidate_update(ticker, {
                    "final_decision": "BLOCKED_G4",
                    "notes": f"Gate 4 blocked: {g4.get('reason')}"
                })
                rows.append(_row(ticker, "BLOCKED_G4", g3=g3))
                continue
            elif g4['action'] == 'FLAG_FOR_REVIEW':
                # Automated environment auto-approves flags but logs the warning
                print_log(f"[gate4] {ticker}: FLAGGED FOR REVIEW (Auto-Approved) — {g4.get('reason')}")

            print_log(f"[gate4] {ticker}: Passed divergence verification.")

            # Gate 5 — Expected Value (EV) calculation
            g5 = decide_gate5_signal(candidate, {'gate1': g1, 'gate2': g2, 'gate3': g3, 'gate4': g4})
            tl = g5.get('trade_levels')
            if g5['decision'] != 'BUY':
                print_log(f"[gate5] {ticker}: SKIP — calculated EV {g5.get('expected_value'):.1%} is below strategy hurdle ({config.MIN_EDGE_PCT:.1%}).")
                emit_candidate_update(ticker, {
                    "final_decision": g5['decision'],
                    "ev": round(g5['expected_value'], 3) if g5.get('expected_value') is not None else None,
                    "win_prob": round(g5['win_probability'], 3) if g5.get('win_probability') is not None else None,
                    "position_confidence": g5.get('position_confidence'),
                    "trade_levels": tl,
                    "notes": f"Gate 5 SKIP: EV {g5.get('expected_value'):.1%} below threshold"
                })
                rows.append(_row(ticker, g5['decision'], g3=g3, g5=g5))
                continue
            
            print_log(f"[gate5] {ticker}: BUY SIGNAL generated! EV={g5.get('expected_value'):.1%}, Entry=${tl['entry']:.2f}, Stop=${tl['stop']:.2f}, Target=${tl['target']:.2f}, R:R={tl['reward_risk']:.1f}")
            emit_candidate_update(ticker, {
                "final_decision": "BUY",
                "ev": round(g5['expected_value'], 3),
                "win_prob": round(g5['win_probability'], 3),
                "position_confidence": g5.get('position_confidence'),
                "trade_levels": tl,
                "notes": f"Gate 5 BUY Signal generated (EV {g5.get('expected_value'):.1%})"
            })

            # Risk Gate Sizing
            risk = validate_trade(ticker, g5, portfolio_value, daily_pnl, open_positions_count, drawdown_pct)
            if not risk['approved']:
                reject_reason = risk.get('reject_reason', 'unknown')
                print_log(f"[risk] {ticker}: REJECTED — {reject_reason}")
                emit_candidate_update(ticker, {
                    "final_decision": f"REJECTED_RISK:{reject_reason}",
                    "risk_reject_reason": reject_reason,
                    "notes": f"Risk rejected: {reject_reason}"
                })
                rows.append(_row(ticker, f"REJECTED_RISK:{reject_reason}", g3=g3, g5=g5, risk=risk))
                continue
            
            pos = risk['position']
            print_log(f"[risk] {ticker}: APPROVED! Quarter-Kelly sized: {pos['shares']} shares (${pos['position_value']:,.2f}, {pos['position_pct']:.1%} of portfolio)")
            emit_candidate_update(ticker, {
                "risk_sizing": {
                    "shares": pos['shares'],
                    "position_value": pos['position_value'],
                    "position_pct": round(pos['position_pct'] * 100, 2)
                },
                "notes": f"Risk sizing approved: {pos['shares']} shares"
            })

            # Execution (Paper Trading Placement)
            if not place_orders:
                print_log(f"[executor] {ticker}: BUY approved but PLACE_ORDERS=false. Order simulation saved.")
                emit_candidate_update(ticker, {
                    "final_decision": "BUY",
                    "notes": "BUY approved (Order simulation saved)"
                })
                rows.append(_row(ticker, "BUY", g3=g3, g5=g5, risk=risk))
                continue

            print_log(f"[executor] {ticker}: Dispatching paper order to Alpaca via REST API (ignore_market_hours={ignore_market_hours})...")
            try:
                audit = position_trade({
                    'ticker': ticker,
                    'shares': pos['shares'],
                    'trade_levels': tl,
                }, ignore_market_hours=ignore_market_hours)
            except Exception as exec_err:
                err_msg = str(exec_err)
                print_log(f"[executor] ❌ {ticker}: Execution failed — {err_msg}")
                emit_candidate_update(ticker, {
                    "final_decision": "EXEC_FAILED",
                    "exec_error": err_msg,
                    "notes": f"Execution failed: {err_msg}"
                })
                rows.append(_row(ticker, "EXEC_FAILED", g3=g3, g5=g5, risk=risk, exec_error=err_msg))
                continue

            if audit is None:
                err_msg = "Order rejected by broker or market closed."
                print_log(f"[executor] ❌ {ticker}: Execution failed — {err_msg}")
                emit_candidate_update(ticker, {
                    "final_decision": "EXEC_FAILED",
                    "exec_error": err_msg,
                    "notes": f"Execution failed: {err_msg}"
                })
                rows.append(_row(ticker, "EXEC_FAILED", g3=g3, g5=g5, risk=risk, exec_error=err_msg))
                continue

            open_positions_count += 1
            status = audit.get('status')
            is_market_closed = audit.get('is_market_closed', False)

            if status == 'filled':
                decision = 'PLACED' if audit.get('stop_attached') else 'PLACED_UNPROTECTED'
                print_log(f"[executor] {ticker}: Order filled successfully! Decision: {decision}")
            elif is_market_closed:
                decision = 'QUEUED_MARKET_CLOSED'
                print_log(f"[executor] {ticker}: Market closed — order accepted & queued for open! Decision: {decision}")
            else:
                decision = 'PLACED'
                print_log(f"[executor] {ticker}: Order placed & working on exchange (status: {status})! Decision: {decision}")
            
            emit_candidate_update(ticker, {
                "final_decision": decision,
                "notes": f"Order {decision}"
            })
            rows.append(_row(ticker, decision, g3=g3, g5=g5, risk=risk, exec_audit=audit))

    print_log(f"[pipeline] Run completed. Processed {processed_count} candidates.")

    # Calculate final summary statistics for telemetry output
    num_universe = len(universe_df)
    num_scanned = len(candidates_df)
    num_processed = processed_count
    
    num_gate5_buy = sum(1 for r in rows if r['final_decision'] in ['BUY', 'PLACED', 'PLACED_UNPROTECTED', 'QUEUED_MARKET_CLOSED', 'EXEC_FAILED'] or r['final_decision'].startswith('REJECTED_RISK'))
    num_approved = sum(1 for r in rows if r['final_decision'] in ['BUY', 'PLACED', 'PLACED_UNPROTECTED', 'QUEUED_MARKET_CLOSED'])
    num_placed = sum(1 for r in rows if r['final_decision'] in ['PLACED', 'PLACED_UNPROTECTED', 'QUEUED_MARKET_CLOSED'])

    # Build structured telemetry payload
    telemetry_payload = {
        "timestamp": datetime.now().isoformat(),
        "portfolio": {
            "value": float(portfolio_value),
            "daily_pnl": float(daily_pnl),
            "daily_pnl_pct": round((daily_pnl / portfolio_value) * 100, 2) if portfolio_value > 0 else 0.0,
            "open_positions": int(open_positions_count),
            "max_positions": int(config.MAX_OPEN_POSITIONS),
            "drawdown_pct": round(float(drawdown_pct) * 100, 2),
            "vix_level": float((shared.get('vix') or {}).get('level', 15.0)),
            "spy_change_pct": round(float((shared.get('spy') or {}).get('change_pct_today', 0.0)) * 100, 2),
            "hours_to_next_macro": float(shared['macro_hours']) if shared.get('macro_hours') is not None else None
        },
        "funnel": {
            "universe_count": int(num_universe),
            "scanned_count": int(num_scanned),
            "processed_count": int(num_processed),
            "gate5_buy_count": int(num_gate5_buy),
            "approved_count": int(num_approved),
            "placed_count": int(num_placed)
        },
        "results": []
    }

    # Format the row results for output mapping
    for r in rows:
        formatted_row = {
            "ticker": r["ticker"],
            "final_decision": r["final_decision"],
            "g3_direction": r["g3_direction"],
            "g3_confidence": r["g3_confidence"],
            "ev": r["ev"],
            "win_prob": r["win_prob"],
            "position_confidence": r["position_confidence"],
            "trade_levels": {
                "entry": r["entry"],
                "stop": r["stop"],
                "target": r["target"],
                "reward_risk": r["reward_risk"]
            } if r["entry"] else None,
            "risk_sizing": {
                "shares": r["shares"],
                "position_value": r["position_value"],
                "position_pct": round(r["position_pct"] * 100, 2) if r["position_pct"] else None
            } if r["shares"] else None,
            "risk_reject_reason": r["risk_reject"],
            "exec_error": r.get("exec_error"),
            "notes": f"Decision: {r['final_decision']}" + (f" | Error: {r['exec_error']}" if r.get("exec_error") else "")
        }
        telemetry_payload["results"].append(formatted_row)

    # Save structured telemetry directly to disk
    try:
        latest_run_file = scanner_dir / 'data' / 'latest_run.json'
        latest_run_file.parent.mkdir(parents=True, exist_ok=True)
        with open(latest_run_file, 'w', encoding='utf-8') as f:
            json.dump(telemetry_payload, f, indent=2)
        print_log(f"[telemetry] Saved latest run data directly to {latest_run_file.name}")
    except Exception as e:
        print_log(f"[telemetry] Warning: Could not write latest_run.json directly: {e}")

    # Output the JSON token that server.ts can parse
    print_log("__JSON_OUTPUT_START__")
    print_log(json.dumps(telemetry_payload, indent=2))
    print_log("__JSON_OUTPUT_END__")
    print_log("=== BOT PIPELINE RUN COMPLETED ===")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# backend/cli.py — Production-grade end-to-end pipeline runner
#
# Runs the entire trading pipeline end-to-end and outputs structured JSON.
# Run as backend.cli with the project virtual environment and strategy configuration.

import sys
import pathlib
import json
import argparse
import pandas as pd
from datetime import datetime

# Define paths
backend_dir = pathlib.Path(__file__).resolve().parent
scanner_dir = backend_dir / 'scanner'

# Import our modular strategy elements
from backend.config import TOP_N, MIN_SCORE, MAX_OPEN_POSITIONS
from backend.scanner.momentum import run_scan
from backend.risk.gate import validate_trade
from backend.broker.alpaca import (
    get_portfolio_value,
    get_open_positions,
    get_daily_pnl,
    get_drawdown_pct,
    position_trade,
    ENTRY_SIDE,
    ENTRY_ORDER_TYPE,
)
from backend.intelligence.run import get_shared_market_data, run_pipeline

def print_log(msg: str):
    """Prints immediately to stdout with flushing so Express/Vite streams it in real-time."""
    print(msg, flush=True)

def main():
    parser = argparse.ArgumentParser(description="Run the entire stock-selection pipeline.")
    parser.add_argument('--place-orders', action='store_true', help="Place actual paper orders on Alpaca if approved")
    parser.add_argument('--ignore-market-hours', action='store_true', help="Place orders even when Alpaca market clock is closed")
    args = parser.parse_args()

    print_log("=== STARTING TRADING BOT PIPELINE RUN ===")

    # 1. Stage 1 — Universe: the rows of the latest Neon universe batch, sent by Node on stdin.
    # The universe is built only by Load Watchlist, so every scanned universe is a Neon batch.
    universe_df = pd.read_json(sys.stdin)
    print_log(f"[universe] Loaded {len(universe_df)} stocks from the latest Neon universe batch")

    # 2. Stage 2 — Momentum Scanner
    print_log("[scanner] Running Stage 2 (Momentum Scanner)...")
    candidates_df = run_scan(df=universe_df)
    print_log(f"[scanner] Found {len(candidates_df)} candidates with momentum score >= {MIN_SCORE}")

    # 3. Live portfolio context and market-wide data; any failure stops the run
    print_log("[portfolio] Querying live Alpaca account...")
    portfolio_value = get_portfolio_value()
    open_positions_count = len(get_open_positions())
    daily_pnl = get_daily_pnl()
    drawdown_pct = get_drawdown_pct()
    print_log(f"[portfolio] Live metrics: PV=${portfolio_value:,.2f}, PnL=${daily_pnl:+,.2f}, Open={open_positions_count}, DD={drawdown_pct:.2%}")

    place_orders = args.place_orders
    ignore_market_hours = args.ignore_market_hours

    print_log("[gate1] Fetching market-wide shared indexes (SPY, VIX, Macro Calendar)...")
    shared = get_shared_market_data()
    if shared is None:
        raise RuntimeError("Market-wide data (VIX, SPY, macro calendar) could not be fetched")
    print_log(f"[gate1] Shared Market Data: VIX={shared['vix']['level']}, SPY change={shared['spy']['change_pct_today']:.2%}, Macro Hours={shared['macro_hours']}")

    # 4. Processing candidates through Gates 1-5, Risk Gate, and Execution
    rows = []
    processed_count = 0
    top_n_limit = TOP_N

    def emit_candidate_update(ticker: str, delta: dict):
        payload = {"ticker": ticker, **delta}
        print_log(f"__CANDIDATE_UPDATE__ {json.dumps(payload)}")

    def _row(ticker, decision, scan, g1=None, g2=None, g3=None, g4=None, g5=None, risk=None, order=None, exec_error=None):
        tl = g5.get('trade_levels') if g5 else None
        pos = risk['position'] if risk else None

        # One entry per gate that actually ran, built only from that gate's own result.
        # The Risk gate is not recorded here: its outcome lives in final_decision and order.
        gate_evals = []
        if g1:
            gate_evals.append({"gate_id": 1, "passed": g1['passed'], "score": None,
                               "reasoning": g1['block_reason'], "sub_evaluations": g1['checks']})
        if g2:
            gate_evals.append({"gate_id": 2, "passed": g2['passed'], "score": None,
                               "reasoning": g2['reason'], "sub_evaluations": g2})
        if g3:
            gate_evals.append({"gate_id": 3, "passed": g3['passed'], "score": g3['confidence'],
                               "reasoning": g3['key_reason'], "sub_evaluations": g3})
        if g4:
            # FLAG_FOR_REVIEW is auto-approved by this pipeline, so only BLOCK stops the candidate
            gate_evals.append({"gate_id": 4, "passed": g4['action'] != 'BLOCK', "score": None,
                               "reasoning": g4['reason'], "sub_evaluations": g4})
        if g5:
            gate_evals.append({"gate_id": 5, "passed": g5['passed'], "score": g5['expected_value'],
                               "reasoning": g5['reason'], "sub_evaluations": g5})

        return {
            'ticker': ticker,
            'final_decision': decision,
            'scan': scan,
            'order': order,
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
            'gate_evaluations': gate_evals,
        }

    def _real_order(audit):
        """order_executions record for an order Alpaca actually received; every value comes from Alpaca."""
        return {
            'client_order_id': audit['client_order_id'],
            'alpaca_order_id': audit['entry_order_id'],
            'side': audit['side'],
            'order_type': audit['order_type'],
            'qty': audit['qty'],
            'stop_loss': audit['initial_stop_price'],
            'filled_qty': audit['filled_qty'],
            'filled_avg_price': audit['filled_avg_price'],
            'status': audit['status'],
            'raw_response': audit,
        }

    def _simulated_order(pos, tl):
        """order_executions record for a BUY approved with order placement off: no order exists at Alpaca."""
        return {
            'client_order_id': None,
            'alpaca_order_id': None,
            'side': ENTRY_SIDE.value,
            'order_type': ENTRY_ORDER_TYPE.value,
            'qty': pos['shares'],
            'stop_loss': tl['stop'],
            'filled_qty': None,
            'filled_avg_price': None,
            'status': 'SIMULATED',
            'raw_response': pos,
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

            # Stage 2 scan values for this candidate (saved to scanned_stocks.rule_evaluations)
            scan = {
                'score': int(r['score']),
                'price': float(r['price']),
                'rsi': float(r['rsi']),
                'sma20': float(r['sma20']),
                'sma50': float(r['sma50']),
                'atr': float(r['atr']),
            }

            intelligence = run_pipeline(
                candidate, portfolio_value, daily_pnl, shared,
                on_log=print_log,
                on_update=lambda delta: emit_candidate_update(ticker, delta),
            )
            gates = intelligence['gates']
            gate_results = {f"g{key.removeprefix('gate')}": value for key, value in gates.items()}
            if intelligence['final_decision'] != 'BUY':
                rows.append(_row(ticker, intelligence['final_decision'], scan, **gate_results))
                continue

            g1, g2, g3, g4, g5 = (gates[f'gate{gate_id}'] for gate_id in range(1, 6))
            tl = g5.get('trade_levels')

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
                rows.append(_row(ticker, f"REJECTED_RISK:{reject_reason}", scan, g1=g1, g2=g2, g3=g3, g4=g4, g5=g5, risk=risk))
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
                rows.append(_row(ticker, "BUY", scan, g1=g1, g2=g2, g3=g3, g4=g4, g5=g5, risk=risk, order=_simulated_order(pos, tl)))
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
                rows.append(_row(ticker, "EXEC_FAILED", scan, g1=g1, g2=g2, g3=g3, g4=g4, g5=g5, risk=risk, exec_error=err_msg))
                continue

            if audit is None:
                err_msg = "Order rejected by broker or market closed."
                print_log(f"[executor] ❌ {ticker}: Execution failed — {err_msg}")
                emit_candidate_update(ticker, {
                    "final_decision": "EXEC_FAILED",
                    "exec_error": err_msg,
                    "notes": f"Execution failed: {err_msg}"
                })
                rows.append(_row(ticker, "EXEC_FAILED", scan, g1=g1, g2=g2, g3=g3, g4=g4, g5=g5, risk=risk, exec_error=err_msg))
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
            rows.append(_row(ticker, decision, scan, g1=g1, g2=g2, g3=g3, g4=g4, g5=g5, risk=risk, order=_real_order(audit)))

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
            "max_positions": int(MAX_OPEN_POSITIONS),
            "drawdown_pct": round(float(drawdown_pct) * 100, 2),
            "vix_level": float(shared['vix']['level']),
            "spy_change_pct": round(float(shared['spy']['change_pct_today']) * 100, 2),
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
            "exec_error": r["exec_error"],
            "scan": r["scan"],
            "gate_evaluations": r["gate_evaluations"],
            "order": r["order"],
            "notes": f"Decision: {r['final_decision']}" + (f" | Error: {r['exec_error']}" if r.get("exec_error") else "")
        }
        telemetry_payload["results"].append(formatted_row)

    # Save structured telemetry to disk; Node reads this file, so a failed write must stop the run
    latest_run_file = scanner_dir / 'data' / 'latest_run.json'
    latest_run_file.parent.mkdir(parents=True, exist_ok=True)
    with open(latest_run_file, 'w', encoding='utf-8') as f:
        json.dump(telemetry_payload, f, indent=2)
    print_log(f"[telemetry] Saved latest run data directly to {latest_run_file.name}")

    # Output the JSON token that server.ts can parse
    print_log("__JSON_OUTPUT_START__")
    print_log(json.dumps(telemetry_payload, indent=2))
    print_log("__JSON_OUTPUT_END__")
    print_log("=== BOT PIPELINE RUN COMPLETED ===")

if __name__ == '__main__':
    main()

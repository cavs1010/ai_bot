import json
import sys
import os
import importlib

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

alpaca = importlib.import_module('backend.04_execution.alpaca_executor')

if __name__ == '__main__':
    try:
        pv = alpaca.get_portfolio_value()
        pnl = alpaca.get_daily_pnl()
        pos = alpaca.get_open_positions()
        dd = alpaca.get_drawdown_pct()
        
        base_pv = pv - pnl
        pnl_pct = round((pnl / base_pv) * 100, 2) if base_pv else 0.0

        print(json.dumps({
            'success': True,
            'value': pv,
            'daily_pnl': round(pnl, 2),
            'daily_pnl_pct': pnl_pct,
            'open_positions': len(pos),
            'drawdown_pct': round(dd * 100, 2)
        }))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))

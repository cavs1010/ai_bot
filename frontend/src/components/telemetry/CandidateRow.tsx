import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  ChevronRight, 
  Info 
} from 'lucide-react';
import { CandidateResult } from '../../types';

interface CandidateRowProps {
  row: CandidateResult;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function CandidateRow({ row, isExpanded, onToggleExpand }: CandidateRowProps) {
  const isPlaced = row.final_decision === 'PLACED' || row.final_decision === 'PLACED_UNPROTECTED';
  const isQueued = row.final_decision === 'QUEUED_MARKET_CLOSED';
  const isExecFailed = row.final_decision === 'EXEC_FAILED' || row.final_decision?.startsWith('EXEC_FAILED');
  const isBuy = row.final_decision === 'BUY';
  const isBlocked = row.final_decision?.startsWith('BLOCKED') || row.final_decision?.startsWith('REJECTED_RISK');
  const isSkip = row.final_decision === 'SKIP';

  return (
    <>
      <tr 
        className={`hover:bg-slate-900/30 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-900/40' : ''}`} 
        onClick={onToggleExpand}
      >
        {/* TICKER */}
        <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2">
          {row.ticker}
          {(isBuy || isPlaced || isQueued) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>}
          {isExecFailed && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>}
          {isBlocked && <span className="w-1.5 h-1.5 rounded-full bg-rose-500/60 inline-block"></span>}
        </td>

        {/* FINAL DECISION BADGE */}
        <td className="py-3.5 px-4">
          {isPlaced && (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center w-fit gap-1 shadow-sm">
              <CheckCircle className="h-3 w-3 text-emerald-400" />
              ORDER FILLED / PLACED
            </span>
          )}
          {isQueued && (
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center w-fit gap-1">
              <Clock className="h-3 w-3 text-blue-400" />
              QUEUED FOR OPEN
            </span>
          )}
          {isExecFailed && (
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded text-[10px] font-bold flex items-center w-fit gap-1 shadow-sm">
              <XCircle className="h-3 w-3 text-rose-400" />
              EXECUTION FAILED
            </span>
          )}
          {isBuy && !isPlaced && !isQueued && !isExecFailed && (
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center w-fit gap-1">
              <CheckCircle className="h-3 w-3" />
              BUY / Approved
            </span>
          )}
          {isBlocked && (
            <span className="bg-rose-950/60 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center w-fit gap-1 shadow-sm font-mono">
              <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
              {row.final_decision.replace('REJECTED_RISK:open_positions', 'BLOCKED_RISK:max_positions')}
            </span>
          )}
          {isSkip && (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center w-fit gap-1">
              <AlertTriangle className="h-3 w-3" />
              SKIP (Low EV)
            </span>
          )}
          {!isBuy && !isPlaced && !isQueued && !isExecFailed && !isBlocked && !isSkip && (
            <span className="bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center w-fit gap-1 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              {row.final_decision || 'EVALUATING...'}
            </span>
          )}
        </td>

        {/* G3 SENTIMENT */}
        <td className="py-3.5 px-4 text-slate-300">
          {row.g3_direction ? (
            <span className="flex items-center gap-1.5">
              <span className={`font-medium ${row.g3_direction === 'BULLISH' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {row.g3_direction}
              </span>
              <span className="text-slate-500 text-[10px]">({row.g3_confidence}/10)</span>
            </span>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>

        {/* EXPECTED VALUE */}
        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-200">
          {row.ev !== null && row.ev !== undefined ? `+${(row.ev * 100).toFixed(1)}%` : <span className="text-slate-600">—</span>}
        </td>

        {/* WIN PROB */}
        <td className="py-3.5 px-4 text-right font-mono text-slate-300">
          {row.win_prob !== null && row.win_prob !== undefined ? `${(row.win_prob * 100).toFixed(0)}%` : <span className="text-slate-600">—</span>}
        </td>

        {/* GEOMETRY (ENTRY/STOP/TARGET) */}
        <td className="py-3.5 px-4 font-mono text-slate-400">
          {row.trade_levels ? (
            <div className="flex items-center gap-1">
              <span className="text-slate-100 font-semibold">${row.trade_levels.entry}</span>
              <span className="text-slate-600">/</span>
              <span className="text-rose-400">${row.trade_levels.stop}</span>
              <span className="text-slate-600">/</span>
              <span className="text-emerald-400">${row.trade_levels.target}</span>
              <span className="text-[10px] text-slate-500 ml-1">({row.trade_levels.reward_risk}R)</span>
            </div>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>

        {/* RISK SIZING */}
        <td className="py-3.5 px-4 text-right">
          {row.risk_sizing ? (
            <div>
              <div className="font-semibold text-slate-100">{row.risk_sizing.shares} sh</div>
              <div className="text-[10px] text-slate-400 font-mono">${row.risk_sizing.position_value} ({row.risk_sizing.position_pct}%)</div>
            </div>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>

        {/* EXPAND ACTION */}
        <td className="py-3.5 px-4 text-center">
          <button className="text-slate-500 hover:text-slate-300 p-1">
            <ChevronRight className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-90 text-teal-400' : ''}`} />
          </button>
        </td>
      </tr>

      {/* EXPANDED SUB-ROW DETAILS */}
      {isExpanded && (
        <tr className="bg-slate-900/50">
          <td colSpan={8} className="py-3 px-6 border-b border-slate-850">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Info className="h-3.5 w-3.5 text-teal-400" />
                Pipeline Decision Audit Log
              </div>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                {row.notes}
              </p>
              {(row.exec_error || row.final_decision.startsWith('EXEC_FAILED')) && (
                <div className="bg-rose-950/80 border border-rose-800 rounded p-3 text-rose-200 text-xs w-full flex items-start gap-2.5 my-1.5 shadow-md">
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-300 uppercase tracking-wide">Alpaca Execution Failure Details</div>
                    <div className="font-mono mt-1 text-rose-100">{row.exec_error || row.notes || 'Order rejected by broker'}</div>
                  </div>
                </div>
              )}
              {row.risk_reject_reason && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded p-2.5 text-rose-300 text-xs w-fit flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-rose-400" />
                  <strong>Blocking Reason:</strong> {row.risk_reject_reason}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

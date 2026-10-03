import React from 'react';
import { CheckCircle } from 'lucide-react';
import { CandidateResult, StrategyDials } from '../../types';

interface ApprovedSignalsSectionProps {
  candidates: CandidateResult[];
  dials: StrategyDials;
}

export function ApprovedSignalsSection({ candidates, dials }: ApprovedSignalsSectionProps) {
  const approvedList = candidates.filter(x => 
    x.final_decision === 'BUY' || 
    x.final_decision?.startsWith('PLACED') || 
    x.final_decision === 'QUEUED_MARKET_CLOSED' ||
    (x.risk_sizing && !x.final_decision?.startsWith('BLOCKED') && !x.final_decision?.startsWith('REJECTED_RISK') && x.final_decision !== 'SKIP')
  );

  return (
    <section id="approved_signals_summary" className="bg-slate-950 rounded-xl p-5 border border-slate-800 shadow-md">
      <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase flex items-center gap-2 mb-4">
        <CheckCircle className="h-4 w-4 text-teal-400" />
        Approved Buy Signals Checklist
      </h2>
      
      {approvedList.length === 0 ? (
        <div className="p-6 text-center rounded-lg border border-dashed border-slate-800 text-slate-500 text-xs">
          No approved buy signals generated in the current execution run.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvedList.map((item, i) => {
            const isPlaced = item.final_decision?.startsWith('PLACED');
            const isQueued = item.final_decision === 'QUEUED_MARKET_CLOSED';
            const badgeLabel = isPlaced ? 'Order Filled / Placed' : isQueued ? 'Queued For Open' : 'Sized & Approved';
            const badgeColorClass = isPlaced 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : isQueued 
              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
              : 'bg-teal-500/10 text-teal-400 border-teal-500/20';

            return (
              <div key={i} className="bg-slate-900 rounded-lg p-4 border border-slate-800 relative overflow-hidden">
                <div className={`absolute top-0 right-0 px-2.5 py-1 text-[10px] font-bold uppercase rounded-bl border-l border-b ${badgeColorClass}`}>
                  {badgeLabel}
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base font-bold text-slate-100">{item.ticker}</span>
                  <span className="text-xs text-slate-500 font-mono">/ {item.risk_sizing?.shares ?? item.shares ?? '—'} Shares</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">Allocation Value:</span>
                    <span className="block text-slate-200 font-semibold font-mono">
                      {item.risk_sizing?.position_value ? `$${item.risk_sizing.position_value.toLocaleString()}` : item.position_value ? `$${item.position_value.toLocaleString()}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Trade Level Limits:</span>
                    <span className="block text-slate-200 font-semibold font-mono">
                      ${(item.trade_levels?.entry ?? item.entry ?? 0)} Entry / ${(item.trade_levels?.stop ?? item.stop ?? 0)} Stop
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Model Expected Value:</span>
                    <span className="block text-emerald-400 font-bold font-mono">
                      +{(((item.ev ?? 0)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Stop trails percent:</span>
                    <span className="block text-slate-200 font-medium font-mono">
                      1.5x ATR ({dials?.geometry?.atr_stop_multiplier ?? 1.5} multiplier)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

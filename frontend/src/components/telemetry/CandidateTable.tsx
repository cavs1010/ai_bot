import React from 'react';
import { CandidateResult } from '../../types';
import { CandidateRow } from './CandidateRow';

interface CandidateTableProps {
  candidates: CandidateResult[];
  filter: string;
  setFilter: (filter: string) => void;
  expandedRow: string | null;
  setExpandedRow: (ticker: string | null) => void;
}

export function CandidateTable({
  candidates,
  filter,
  setFilter,
  expandedRow,
  setExpandedRow,
}: CandidateTableProps) {
  const filteredCandidates = candidates.filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'BUY') return item.final_decision === 'BUY' || item.final_decision?.startsWith('PLACED') || item.final_decision === 'QUEUED_MARKET_CLOSED';
    if (filter === 'BLOCKED') return item.final_decision !== 'BUY' && !item.final_decision?.startsWith('PLACED') && item.final_decision !== 'QUEUED_MARKET_CLOSED';
    return true;
  });

  return (
    <section id="results_table_section" className="bg-slate-950 rounded-xl border border-slate-800 shadow-md overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Nightly Candidate Process List</h2>
          <p className="text-xs text-slate-400 mt-1">
            Processed ticker decisions output matching notebook <code className="bg-slate-900 px-1 rounded font-mono text-[10px]">_row()</code> schema.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Filter Decision:</span>
          <div className="bg-slate-900 p-0.5 rounded-lg border border-slate-800 flex">
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 text-[10px] rounded font-medium ${filter === 'ALL' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All ({candidates.length})
            </button>
            <button 
              onClick={() => setFilter('BUY')}
              className={`px-2.5 py-1 text-[10px] rounded font-medium ${filter === 'BUY' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              BUYs ({candidates.filter(x => x.final_decision === 'BUY' || x.final_decision?.startsWith('PLACED') || x.final_decision === 'QUEUED_MARKET_CLOSED').length})
            </button>
            <button 
              onClick={() => setFilter('BLOCKED')}
              className={`px-2.5 py-1 text-[10px] rounded font-medium ${filter === 'BLOCKED' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Blocked / Skips ({candidates.filter(x => x.final_decision !== 'BUY' && !x.final_decision?.startsWith('PLACED') && x.final_decision !== 'QUEUED_MARKET_CLOSED').length})
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-850">
            <tr>
              <th className="py-3 px-4 font-semibold">Ticker</th>
              <th className="py-3 px-4 font-semibold">Final Decision</th>
              <th className="py-3 px-4 font-semibold">G3 Sentiment</th>
              <th className="py-3 px-4 font-semibold text-right">Edge (EV %)</th>
              <th className="py-3 px-4 font-semibold text-right">Win Prob</th>
              <th className="py-3 px-4 font-semibold">Geometry (Entry / Stop / Target)</th>
              <th className="py-3 px-4 font-semibold text-right">Risk Sizing</th>
              <th className="py-3 px-4 text-center">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/60">
            {filteredCandidates.map((row) => (
              <CandidateRow
                key={row.ticker}
                row={row}
                isExpanded={expandedRow === row.ticker}
                onToggleExpand={() => setExpandedRow(expandedRow === row.ticker ? null : row.ticker)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

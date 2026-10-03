import { Fragment, useState } from 'react';
import { ChevronRight, Info } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { ErrorNotice } from '../components/ui/error-notice';

export type Candidate = {
  ticker: string;
  final_decision: string;
  g3_direction: string | null;
  g3_confidence: number | null;
  ev: number | null;
  win_prob: number | null;
  trade_levels: {
    entry: number;
    stop: number;
    target: number;
    reward_risk: number;
  } | null;
  risk_sizing: {
    shares: number;
    position_value: number;
    position_pct: number;
  } | null;
  risk_reject_reason: string | null;
  notes: string;
  exec_error?: string | null;
};

type Filter = 'ALL' | 'BUY' | 'BLOCKED';

type CandidateTableProps = {
  rows: Candidate[];
};

function matches(row: Candidate, filter: Filter) {
  if (filter === 'ALL') return true;
  if (filter === 'BUY') return row.final_decision === 'BUY';
  return row.final_decision.startsWith('BLOCKED') || row.final_decision.startsWith('REJECTED_RISK') || row.final_decision === 'SKIP';
}

function decisionLabel(decision: string) {
  if (decision === 'PLACED' || decision === 'PLACED_UNPROTECTED') return 'Order filled / placed';
  if (decision === 'QUEUED_MARKET_CLOSED') return 'Queued for open';
  if (decision === 'EXEC_FAILED' || decision.startsWith('EXEC_FAILED')) return 'Execution failed';
  if (decision === 'BUY') return 'Buy / approved';
  if (decision.startsWith('BLOCKED') || decision.startsWith('REJECTED_RISK')) {
    return decision.replace('REJECTED_RISK:open_positions', 'BLOCKED_RISK:max_positions');
  }
  if (decision === 'SKIP') return 'Skip (low EV)';
  return decision || 'Evaluating';
}

function decisionKind(decision: string): 'buy' | 'skip' | 'blocked' | 'sim' {
  if (decision === 'PLACED' || decision === 'PLACED_UNPROTECTED' || decision === 'BUY') return 'buy';
  if (decision === 'SKIP') return 'skip';
  if (
    decision.startsWith('BLOCKED') ||
    decision.startsWith('REJECTED_RISK') ||
    decision === 'EXEC_FAILED' ||
    decision.startsWith('EXEC_FAILED')
  ) {
    return 'blocked';
  }
  return 'sim';
}

function DecisionBadge({ decision }: { decision: string }) {
  return <Badge kind={decisionKind(decision)}>{decisionLabel(decision)}</Badge>;
}

export function CandidateTable({ rows }: CandidateTableProps) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const visible = rows.filter((row) => matches(row, filter));
  const buyCount = rows.filter((row) => row.final_decision === 'BUY').length;
  const blockedCount = rows.filter((row) => row.final_decision !== 'BUY').length;

  return (
    <section id="results_table_section" className="bg-canvas rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-h2 text-text">Nightly Candidate Process List</h2>
          <p className="text-body-sm text-text-muted mt-1">
            Processed ticker decisions from the latest run.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-eyebrow text-text-faint uppercase">Filter Decision:</span>
          <div className="flex">
            <button type="button" onClick={() => setFilter('ALL')} className={filter === 'ALL' ? 'tab tab-selected' : 'tab'}>
              All ({rows.length})
            </button>
            <button type="button" onClick={() => setFilter('BUY')} className={filter === 'BUY' ? 'tab tab-selected' : 'tab'}>
              BUYs ({buyCount})
            </button>
            <button type="button" onClick={() => setFilter('BLOCKED')} className={filter === 'BLOCKED' ? 'tab tab-selected' : 'tab'}>
              Blocked / Skips ({blockedCount})
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-body-sm">
          <thead className="bg-surface text-text-muted uppercase text-eyebrow border-b border-border">
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
          <tbody className="divide-y divide-border">
            {visible.map((row) => {
              const open = expandedTicker === row.ticker;
              const live = row.final_decision === 'BUY' || row.final_decision === 'PLACED' || row.final_decision === 'PLACED_UNPROTECTED' || row.final_decision === 'QUEUED_MARKET_CLOSED';
              const failed = row.final_decision === 'EXEC_FAILED' || row.final_decision.startsWith('EXEC_FAILED') || row.final_decision.startsWith('BLOCKED') || row.final_decision.startsWith('REJECTED_RISK');
              return (
                <Fragment key={row.ticker}>
                  <tr
                    className={`hover:bg-surface/40 transition-colors cursor-pointer ${open ? 'bg-surface/50' : ''}`}
                    onClick={() => setExpandedTicker(open ? null : row.ticker)}
                  >
                    <td className="py-3.5 px-4 font-semibold text-text flex items-center gap-2">
                      {row.ticker}
                      {live ? <span className="w-1.5 h-1.5 rounded-full bg-positive inline-block" /> : null}
                      {failed ? <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" /> : null}
                    </td>
                    <td className="py-3.5 px-4">
                      <DecisionBadge decision={row.final_decision} />
                    </td>
                    <td className="py-3.5 px-4 text-text">
                      {row.g3_direction ? (
                        <span className="flex items-center gap-1.5">
                          <span className={row.g3_direction === 'BULLISH' ? 'text-positive font-medium' : 'text-text-muted font-medium'}>
                            {row.g3_direction}
                          </span>
                          <span className="text-text-faint text-eyebrow">({row.g3_confidence}/10)</span>
                        </span>
                      ) : (
                        <span className="text-text-faint">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-text">
                      {row.ev !== null ? `+${(row.ev * 100).toFixed(1)}%` : <span className="text-text-faint">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-text-muted">
                      {row.win_prob !== null ? `${(row.win_prob * 100).toFixed(0)}%` : <span className="text-text-faint">—</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-text-muted">
                      {row.trade_levels ? (
                        <div className="flex items-center gap-1">
                          <span className="text-text font-semibold">${row.trade_levels.entry}</span>
                          <span className="text-text-faint">/</span>
                          <span className="text-danger">${row.trade_levels.stop}</span>
                          <span className="text-text-faint">/</span>
                          <span className="text-positive">${row.trade_levels.target}</span>
                          <span className="text-eyebrow text-text-faint ml-1">({row.trade_levels.reward_risk}R)</span>
                        </div>
                      ) : (
                        <span className="text-text-faint">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {row.risk_sizing ? (
                        <div>
                          <div className="font-semibold text-text">{row.risk_sizing.shares} sh</div>
                          <div className="text-eyebrow text-text-muted font-mono">
                            ${row.risk_sizing.position_value} ({row.risk_sizing.position_pct}%)
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-faint">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-text-faint inline-flex p-1">
                        <ChevronRight className={`h-4 w-4 transform transition-transform ${open ? 'rotate-90 text-accent' : ''}`} />
                      </span>
                    </td>
                  </tr>
                  {open ? (
                    <tr className="bg-surface/40">
                      <td colSpan={8} className="py-3 px-6 border-b border-border">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-body-sm font-semibold text-text">
                            <Info className="h-3.5 w-3.5 text-accent" />
                            Pipeline Decision Audit Log
                          </div>
                          <p className="text-body-sm text-text max-w-3xl leading-relaxed">{row.notes}</p>
                          {(row.exec_error || row.final_decision.startsWith('EXEC_FAILED')) ? (
                            <ErrorNotice
                              layout="inset"
                              title="Alpaca Execution Failure Details"
                              message={row.exec_error || row.notes || 'Order rejected by broker'}
                            />
                          ) : null}
                          {row.risk_reject_reason ? (
                            <ErrorNotice layout="inset" title="Blocking Reason:" message={row.risk_reject_reason} />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

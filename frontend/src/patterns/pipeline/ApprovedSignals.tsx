import { CheckCircle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { SignalCard } from '../../components/ui/signal-card';
import type { Candidate } from '../../types/telemetry';

type ApprovedSignalsProps = {
  rows: Candidate[];
  stopMultiplier: number;
};

function isApproved(row: Candidate) {
  if (row.final_decision === 'BUY') return true;
  if (row.final_decision.startsWith('PLACED')) return true;
  if (row.final_decision === 'QUEUED_MARKET_CLOSED') return true;
  return Boolean(row.risk_sizing)
    && !row.final_decision.startsWith('BLOCKED')
    && !row.final_decision.startsWith('REJECTED_RISK')
    && row.final_decision !== 'SKIP';
}

function status(decision: string): { kind: 'buy' | 'sim'; label: string } {
  if (decision.startsWith('PLACED')) return { kind: 'buy', label: 'Order filled / placed' };
  if (decision === 'QUEUED_MARKET_CLOSED') return { kind: 'sim', label: 'Queued for open' };
  return { kind: 'buy', label: 'Sized & approved' };
}

function money(value: number) {
  return `$${value.toLocaleString()}`;
}

export function ApprovedSignals({ rows, stopMultiplier }: ApprovedSignalsProps) {
  const approved = rows.filter(isApproved);

  return (
    <section id="approved_signals_summary" className="bg-canvas rounded-xl p-5 border border-border">
      <h2 className="text-h2 text-text-muted uppercase flex items-center gap-2 mb-4">
        <CheckCircle className="h-4 w-4 text-accent" />
        Approved Buy Signals Checklist
      </h2>
      {approved.length === 0 ? (
        <div className="p-6 text-center rounded-md border border-dashed border-border text-text-faint text-body-sm">
          No approved buy signals generated in the current execution run.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approved.map((row) => {
            const mark = status(row.final_decision);
            const shares = row.risk_sizing ? row.risk_sizing.shares : null;
            const allocation = row.risk_sizing ? money(row.risk_sizing.position_value) : '—';
            const levels = row.trade_levels
              ? `$${row.trade_levels.entry} Entry / $${row.trade_levels.stop} Stop`
              : '—';
            const edge = row.ev !== null ? `+${(row.ev * 100).toFixed(1)}%` : '—';
            return (
              <SignalCard key={row.ticker} corner={<Badge kind={mark.kind}>{mark.label}</Badge>}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-body font-bold text-text">{row.ticker}</span>
                  <span className="text-body-sm text-text-faint font-mono">/ {shares ?? '—'} Shares</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm">
                  <div>
                    <span className="text-text-faint">Allocation Value:</span>
                    <span className="block text-text font-semibold font-mono">{allocation}</span>
                  </div>
                  <div>
                    <span className="text-text-faint">Trade Level Limits:</span>
                    <span className="block text-text font-semibold font-mono">{levels}</span>
                  </div>
                  <div>
                    <span className="text-text-faint">Model Expected Value:</span>
                    <span className="block text-positive font-bold font-mono">{edge}</span>
                  </div>
                  <div>
                    <span className="text-text-faint">Stop trails percent:</span>
                    <span className="block text-text font-medium font-mono">{stopMultiplier}x ATR</span>
                  </div>
                </div>
              </SignalCard>
            );
          })}
        </div>
      )}
    </section>
  );
}

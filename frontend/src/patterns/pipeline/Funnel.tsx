import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { AlertTriangle, ArrowRight, Layers, Play, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StageCard, type StageTone } from '../../components/ui/stage-card';
import type { FunnelCounts } from '../../types/telemetry';

type FunnelProps = {
  counts: FunnelCounts;
  formattedTimestamp: string;
  running: boolean;
  buildingWatchlist: boolean;
  liveOrders: boolean;
  log: string[];
  onViewList: () => void;
  onLoadWatchlist: () => void;
  onFastReplay: () => void;
  onRunScanner: () => void;
};

type Stage = {
  key: string;
  title: string;
  count: number;
  subtitle: string;
  loading: boolean;
  loadingLabel: string;
  tone: StageTone;
  live: boolean;
  action?: ReactNode;
};

export function Funnel({
  counts,
  formattedTimestamp,
  running,
  buildingWatchlist,
  liveOrders,
  log,
  onViewList,
  onLoadWatchlist,
  onFastReplay,
  onRunScanner,
}: FunnelProps) {
  const busy = running || buildingWatchlist;
  const stages: Stage[] = [
    {
      key: 'universe',
      title: '1. Universe Watchlist',
      count: counts.universe_count,
      subtitle: 'From universe.json',
      loading: buildingWatchlist,
      loadingLabel: 'Building...',
      tone: 'accent',
      live: false,
      action: (
        <Button
          id="btn_view_universe_list"
          role="secondary"
          label="View List"
          icon={<ArrowRight className="h-4 w-4" />}
          onClick={onViewList}
          disabled={false}
          busy={false}
          block
        />
      ),
    },
    {
      key: 'scanned',
      title: '2. Scanned Candidate',
      count: counts.scanned_count,
      subtitle: 'Passed momentum score',
      loading: running,
      loadingLabel: 'Scanning...',
      tone: 'accent',
      live: false,
    },
    {
      key: 'processed',
      title: '3. Processed (Gate 1)',
      count: counts.processed_count,
      subtitle: 'Survived hard limits',
      loading: running,
      loadingLabel: 'Evaluating...',
      tone: 'accent',
      live: false,
    },
    {
      key: 'gate5',
      title: '4. Gate-5 BUY Signal',
      count: counts.gate5_buy_count,
      subtitle: 'AI & Edge Model OK',
      loading: running,
      loadingLabel: 'Evaluating...',
      tone: 'positive',
      live: false,
    },
    {
      key: 'approved',
      title: '5. Risk Approved',
      count: counts.approved_count,
      subtitle: 'Passed size constraints',
      loading: running,
      loadingLabel: 'Evaluating...',
      tone: 'accent',
      live: false,
    },
    {
      key: 'placed',
      title: '6. Orders Placed',
      count: counts.placed_count,
      subtitle: `PLACE_ORDERS = ${liveOrders ? 'true (LIVE)' : 'false'}`,
      loading: running,
      loadingLabel: 'Evaluating...',
      tone: liveOrders ? 'danger' : 'accent',
      live: liveOrders,
    },
  ];

  const runLabel = running
    ? liveOrders
      ? 'Executing Live Orders...'
      : 'Running Pipeline...'
    : liveOrders
      ? 'Run Scanner (LIVE ORDERS)'
      : 'Run Momentum Scanner (Dry Run)';

  return (
    <section id="funnel_container" className="bg-canvas rounded-xl p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-h2 text-text-muted uppercase flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent" />
          Nightly Filter Funnel Summary
        </h2>
        <div className="text-text-faint flex items-center gap-1.5">
          <span className={`inline-block w-2 h-2 rounded-full ${busy ? 'bg-warning animate-ping' : 'bg-accent'}`} />
          Last Processed: <span className="font-mono text-text">{busy ? 'Scanning in progress...' : formattedTimestamp}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-stretch">
        {stages.map((stage, index) => (
          <Fragment key={stage.key}>
            <StageCard
              title={stage.title}
              count={stage.count}
              subtitle={stage.subtitle}
              loading={stage.loading}
              loadingLabel={stage.loadingLabel}
              tone={stage.tone}
              live={stage.live}
              action={stage.action}
            />
            {index < stages.length - 1 ? (
              <div className="hidden md:flex items-center justify-center text-text-faint">
                <ArrowRight className="h-5 w-5" />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-body-sm text-text-muted max-w-xl">
          💡 Use <strong>Load Watchlist</strong> to rebuild Stage 1 (
          <code className="bg-surface px-1.5 py-0.5 rounded text-accent">universe.json</code>
          ), or <strong>Run Momentum Scanner</strong> to scan the active universe through the 6-stage funnel.
        </p>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button
            id="btn_load_watchlist_action"
            role="secondary"
            label={buildingWatchlist ? 'Generating Watchlist...' : 'Load Watchlist (Stage 1)'}
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={onLoadWatchlist}
            disabled={busy}
            busy={buildingWatchlist}
            block={false}
          />
          <Button
            id="btn_fast_replay_action"
            role="secondary"
            label="Fast Replay ($0 Tokens)"
            icon={<Sparkles className="h-4 w-4" />}
            onClick={onFastReplay}
            disabled={busy}
            busy={false}
            block={false}
            title="Simulate / Replay pipeline telemetry in ~2s without making external LLM or API calls ($0 Token Cost)"
          />
          <Button
            id="btn_run_momentum_scanner"
            role={liveOrders ? 'danger' : 'primary'}
            label={runLabel}
            icon={liveOrders ? <AlertTriangle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            onClick={onRunScanner}
            disabled={busy}
            busy={running}
            block={false}
          />
        </div>
      </div>

      {running ? (
        <div id="simulator_log" className="mt-4 bg-canvas rounded-lg p-3.5 font-mono text-accent border border-accent/20 h-40 overflow-y-auto space-y-1">
          <div className="text-text-faint font-bold border-b border-border pb-1 mb-2">⚡ PIPELINE DRY RUN CONSOLE LOG OUT</div>
          {log.map((line, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-text-faint select-none">[{index + 1}]</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

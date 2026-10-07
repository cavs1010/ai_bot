import { ApprovedSignals } from '../patterns/pipeline/ApprovedSignals';
import { CandidateTable } from '../patterns/pipeline/CandidateTable';
import { Funnel } from '../patterns/pipeline/Funnel';
import type { RunState } from '../types/telemetry';

type LastRunProps = {
  universeCount: number | null;
  run: RunState | null;
  formattedTimestamp: string;
  running: boolean;
  buildingWatchlist: boolean;
  liveOrders: boolean;
  log: string[];
  stopMultiplier: number;
  onViewList: () => void;
  onLoadWatchlist: () => void;
  onFastReplay: () => void;
  onRunScanner: () => void;
};

export function LastRun({
  universeCount,
  run,
  formattedTimestamp,
  running,
  buildingWatchlist,
  liveOrders,
  log,
  stopMultiplier,
  onViewList,
  onLoadWatchlist,
  onFastReplay,
  onRunScanner,
}: LastRunProps) {
  return (
    <div id="telemetry_view" className="space-y-6">
      <Funnel
        universeCount={universeCount}
        counts={run ? run.funnel : null}
        formattedTimestamp={formattedTimestamp}
        running={running}
        buildingWatchlist={buildingWatchlist}
        liveOrders={liveOrders}
        log={log}
        onViewList={onViewList}
        onLoadWatchlist={onLoadWatchlist}
        onFastReplay={onFastReplay}
        onRunScanner={onRunScanner}
      />
      {run ? (
        <>
          <CandidateTable rows={run.results} />
          <ApprovedSignals rows={run.results} stopMultiplier={stopMultiplier} />
        </>
      ) : (
        <p className="text-body-sm text-text-muted bg-canvas p-5 rounded-xl border border-border">
          No pipeline run yet. Results appear here once you run the pipeline.
        </p>
      )}
    </div>
  );
}

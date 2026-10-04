import { ApprovedSignals } from '../patterns/pipeline/ApprovedSignals';
import { CandidateTable } from '../patterns/pipeline/CandidateTable';
import { Funnel } from '../patterns/pipeline/Funnel';
import type { Candidate, FunnelCounts } from '../types/telemetry';

type LastRunProps = {
  counts: FunnelCounts;
  formattedTimestamp: string;
  running: boolean;
  buildingWatchlist: boolean;
  liveOrders: boolean;
  log: string[];
  rows: Candidate[];
  stopMultiplier: number;
  onViewList: () => void;
  onLoadWatchlist: () => void;
  onFastReplay: () => void;
  onRunScanner: () => void;
};

export function LastRun({
  counts,
  formattedTimestamp,
  running,
  buildingWatchlist,
  liveOrders,
  log,
  rows,
  stopMultiplier,
  onViewList,
  onLoadWatchlist,
  onFastReplay,
  onRunScanner,
}: LastRunProps) {
  return (
    <div id="telemetry_view" className="space-y-6">
      <Funnel
        counts={counts}
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
      <CandidateTable rows={rows} />
      <ApprovedSignals rows={rows} stopMultiplier={stopMultiplier} />
    </div>
  );
}

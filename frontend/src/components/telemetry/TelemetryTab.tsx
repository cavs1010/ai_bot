import React from 'react';
import { 
  Layers, 
  ArrowRight, 
  RefreshCw, 
  Sparkles, 
  Play, 
  AlertTriangle, 
  Loader2 
} from 'lucide-react';
import { TelemetryData, StrategyDials } from '../../types';
import { FunnelStageCard } from './FunnelStageCard';
import { CandidateTable } from './CandidateTable';
import { ApprovedSignalsSection } from './ApprovedSignalsSection';

interface TelemetryTabProps {
  telemetry: TelemetryData;
  dials: StrategyDials;
  isRunning: boolean;
  isGeneratingUniverse: boolean;
  placeOrders: boolean;
  formatToLocalDisplay: (rawTimestamp: string | null | undefined) => string;
  openUniverseModal: () => void;
  handleLoadWatchlist: () => void;
  triggerFastReplay: () => void;
  triggerDryRun: (fastMode?: boolean) => void;
  runLog: string[];
  filter: string;
  setFilter: (f: string) => void;
  expandedRow: string | null;
  setExpandedRow: (r: string | null) => void;
}

export function TelemetryTab({
  telemetry,
  dials,
  isRunning,
  isGeneratingUniverse,
  placeOrders,
  formatToLocalDisplay,
  openUniverseModal,
  handleLoadWatchlist,
  triggerFastReplay,
  triggerDryRun,
  runLog,
  filter,
  setFilter,
  expandedRow,
  setExpandedRow,
}: TelemetryTabProps) {
  return (
    <div id="telemetry_view" className="space-y-6">
      
      {/* FUNNEL SUMMARY ROAD BAR */}
      <section id="funnel_container" className="bg-slate-950 rounded-xl p-5 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase flex items-center gap-2">
            <Layers className="h-4 w-4 text-teal-400" />
            Nightly Filter Funnel Summary
          </h2>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${isRunning || isGeneratingUniverse ? 'bg-amber-400 animate-ping' : 'bg-teal-400'}`}></span>
            Last Processed: <span className="font-mono text-slate-300">
              {isRunning || isGeneratingUniverse ? (
                <span className="text-amber-400 font-sans italic font-medium">Scanning in progress...</span>
              ) : (
                formatToLocalDisplay(telemetry.timestamp)
              )}
            </span>
          </div>
        </div>

        {/* Graphical Funnel Flow */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-stretch">
          
          {/* 1. Universe Watchlist */}
          <FunnelStageCard
            stepTitle="1. Universe Watchlist"
            count={telemetry.funnel.universe_count}
            subtitle="From universe.json"
            isLoading={isGeneratingUniverse}
            loadingLabel="Building..."
            extraAction={
              <button
                id="btn_view_universe_list"
                onClick={openUniverseModal}
                className="w-full py-1.5 px-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-[11px] font-semibold rounded border border-teal-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
              >
                <span>View List</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform text-teal-400" />
              </button>
            }
          />

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center text-slate-700">
            <ArrowRight className="h-5 w-5" />
          </div>

          {/* 2. Scanned Candidate */}
          <FunnelStageCard
            stepTitle="2. Scanned Candidate"
            count={telemetry.funnel.scanned_count}
            subtitle="Passed momentum score"
            isLoading={isRunning}
            loadingLabel="Scanning..."
          />

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center text-slate-700">
            <ArrowRight className="h-5 w-5" />
          </div>

          {/* 3. Processed (Gate 1) */}
          <FunnelStageCard
            stepTitle="3. Processed (Gate 1)"
            count={telemetry.funnel.processed_count}
            subtitle="Survived hard limits"
            isLoading={isRunning}
            loadingLabel="Evaluating..."
          />

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center text-slate-700">
            <ArrowRight className="h-5 w-5" />
          </div>

          {/* 4. Gate-5 BUY Signal */}
          <FunnelStageCard
            stepTitle="4. Gate-5 BUY Signal"
            count={telemetry.funnel.gate5_buy_count}
            subtitle="AI & Edge Model OK"
            isLoading={isRunning}
            loadingLabel="Evaluating..."
            accentColor="emerald"
          />

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center text-slate-700">
            <ArrowRight className="h-5 w-5" />
          </div>

          {/* 5. Risk Approved */}
          <FunnelStageCard
            stepTitle="5. Risk Approved"
            count={telemetry.funnel.approved_count}
            subtitle="Passed size constraints"
            isLoading={isRunning}
            loadingLabel="Evaluating..."
          />

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center text-slate-700">
            <ArrowRight className="h-5 w-5" />
          </div>

          {/* 6. Orders Placed */}
          <FunnelStageCard
            stepTitle="6. Orders Placed"
            count={telemetry.funnel.placed_count}
            subtitle={`PLACE_ORDERS = ${placeOrders ? 'true (LIVE)' : 'false'}`}
            isLoading={isRunning}
            loadingLabel="Evaluating..."
            accentColor={placeOrders ? 'red' : 'teal'}
            isLiveOrder={placeOrders}
          />

        </div>

        {/* ACTION: TRIGGER BUTTONS */}
        <div className="mt-5 border-t border-slate-850 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 max-w-xl">
            💡 Use <strong>Load Watchlist</strong> to rebuild Stage 1 (<code className="bg-slate-900 px-1.5 py-0.5 rounded text-teal-400 text-[10px]">universe.json</code>), or <strong>Run Momentum Scanner</strong> to scan the active universe through the 6-stage funnel.
          </p>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              id="btn_load_watchlist_action"
              onClick={handleLoadWatchlist}
              disabled={isGeneratingUniverse || isRunning}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${isGeneratingUniverse ? 'bg-slate-800 text-teal-400 border border-slate-700 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 cursor-pointer'}`}
            >
              {isGeneratingUniverse ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isGeneratingUniverse ? 'Generating Watchlist...' : 'Load Watchlist (Stage 1)'}
            </button>

            <button
              id="btn_fast_replay_action"
              onClick={triggerFastReplay}
              disabled={isRunning || isGeneratingUniverse}
              title="Simulate / Replay pipeline telemetry in ~2s without making external LLM or API calls ($0 Token Cost)"
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
                isRunning 
                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' 
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 cursor-pointer shadow-sm active:scale-95'
              }`}
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Fast Replay ($0 Tokens)</span>
            </button>

            <button
              id="btn_run_momentum_scanner"
              onClick={() => triggerDryRun(false)}
              disabled={isRunning || isGeneratingUniverse}
              className={`px-5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                isRunning 
                  ? (placeOrders ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed' : 'bg-teal-500/20 text-teal-400 border border-teal-500/30 cursor-not-allowed')
                  : (placeOrders ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold shadow-lg shadow-red-950/50 cursor-pointer animate-pulse' : 'bg-teal-500 text-slate-950 hover:bg-teal-400 cursor-pointer shadow-md')
              }`}
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : (placeOrders ? <AlertTriangle className="h-4 w-4" /> : <Play className="h-4 w-4" />)}
              {isRunning 
                ? (placeOrders ? 'Executing Live Orders...' : 'Running Pipeline...') 
                : (placeOrders ? 'Run Scanner (LIVE ORDERS)' : 'Run Momentum Scanner (Dry Run)')
              }
            </button>
          </div>
        </div>

        {/* REALTIME SIMULATOR LOG TERMINAL BLOCK */}
        {isRunning && (
          <div id="simulator_log" className="mt-4 bg-slate-950 rounded-lg p-3.5 font-mono text-[10px] text-teal-400 border border-teal-500/20 h-40 overflow-y-auto space-y-1 scrollbar-thin">
            <div className="text-slate-500 font-bold border-b border-slate-850 pb-1 mb-2">⚡ PIPELINE DRY RUN CONSOLE LOG OUT</div>
            {runLog.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-600 select-none">[{i+1}]</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* RESULTS CANDIDATE TABLE CONTAINER */}
      <CandidateTable
        candidates={telemetry.results}
        filter={filter}
        setFilter={setFilter}
        expandedRow={expandedRow}
        setExpandedRow={setExpandedRow}
      />

      {/* SEGMENT D: APPROVED SIGNALS SUMMARY */}
      <ApprovedSignalsSection
        candidates={telemetry.results}
        dials={dials}
      />

    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Copy
} from 'lucide-react';
import { OrderToggles } from './patterns/trading/OrderToggles';
import { PortfolioSummary } from './patterns/portfolio/PortfolioSummary';
import { ProposeDiff } from './patterns/strategy/ProposeDiff';
import { UniverseList } from './patterns/universe/UniverseList';
import type { RunState } from './types/telemetry';
import { useLivePortfolio } from './hooks/useLivePortfolio';
import { formatToLocalDisplay } from './utils/time';
import type { UniverseItem } from './types/universe';
import { DesignSpec } from './screens/DesignSpec';
import { LastRun } from './screens/LastRun';
import { StrategyDials } from './screens/StrategyDials';
import type { DialDiff, Dials, StrategyConfig } from './types/dials';
import { diffDials } from './utils/strategyDials';
import { ErrorNotice } from './components/ui/error-notice';

export default function App() {
  const [activeTab, setActiveTab] = useState<'last_run' | 'config' | 'spec'>('last_run');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // This screen only shows what happens in this session: nothing until Load Watchlist or a run
  const [universeCount, setUniverseCount] = useState<number | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  // Active strategy config, loaded from Neon (GET /api/configs/active)
  const [dials, setDials] = useState<Dials | null>(null);
  const [tempDials, setTempDials] = useState<Dials | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [placeOrders, setPlaceOrders] = useState<boolean>(false);
  const [ignoreMarketHours, setIgnoreMarketHours] = useState<boolean>(false);
  const [isGeneratingUniverse, setIsGeneratingUniverse] = useState(false);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // Modal state for Propose & Confirm
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [proposedDiff, setProposedDiff] = useState<DialDiff[]>([]);

  // Strategy config preset (saved to Neon pipeline_configs)
  const [strategyName, setStrategyName] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Universe Modal State
  const [showUniverseModal, setShowUniverseModal] = useState(false);
  const [universeData, setUniverseData] = useState<UniverseItem[]>([]);
  const [isFetchingUniverse, setIsFetchingUniverse] = useState(false);
  const [universeError, setUniverseError] = useState<string | null>(null);

  // Fetch the latest universe watchlist
  const openUniverseModal = async () => {
    setShowUniverseModal(true);
    setIsFetchingUniverse(true);
    setUniverseError(null);
    try {
      const res = await fetch('/api/universe');
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'universe.json not found or could not be loaded.');
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUniverseData(json.data);
      } else {
        setUniverseData([]);
      }
    } catch (err: any) {
      console.error("Error fetching universe:", err);
      setUniverseError(err.message || 'Error loading universe.json');
    } finally {
      setIsFetchingUniverse(false);
    }
  };

  // Pipeline run error banner
  const [pipelineRunError, setPipelineRunError] = useState<string | null>(null);
  const [pipelineErrorExpanded, setPipelineErrorExpanded] = useState<boolean>(true);
  const [copiedError, setCopiedError] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Live Alpaca account: null until Alpaca answers
  const {
    portfolio,
    isFetching: isFetchingPortfolio,
    lastSync: portfolioLastSync,
    error: portfolioError,
    refresh: refreshPortfolio,
    sync: syncPortfolio,
  } = useLivePortfolio(showToast);

  // Load the active strategy config; the dials and the strategy name come only from Neon
  const loadActiveConfig = async () => {
    try {
      const res = await fetch('/api/configs/active');
      const data = await res.json();
      if (res.ok && data.success) {
        const config: StrategyConfig = data.data;
        const loaded: Dials = { selection_params: config.selection_params, money_params: config.money_params };
        setDials(loaded);
        setTempDials(structuredClone(loaded));
        setStrategyName(config.name);
      } else {
        setConfigError(data.error);
      }
    } catch (err: any) {
      setConfigError(err.message);
    }
  };

  // On startup only the strategy config is loaded; run results appear only after Load Watchlist or a run
  useEffect(() => {
    loadActiveConfig();
  }, []);

  // Handler for Stage 1: Load Watchlist / Generate Universe
  const handleLoadWatchlist = async () => {
    setIsGeneratingUniverse(true);
    // A new universe makes any earlier run's results stale: clear them
    setUniverseCount(null);
    setRun(null);
    try {
      const res = await fetch('/api/universe/generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setUniverseCount(data.count);
        showToast(`Universe generated! ${data.count} tickers saved. Stages 2–6 reset.`);
      } else {
        console.error(`${data.error}:`, data.details);
        showToast(`${data.error}: ${data.details}`);
      }
    } catch (err: any) {
      console.error("Error calling /api/universe/generate:", err);
      showToast(`Error generating watchlist: ${err.message}`);
    } finally {
      setIsGeneratingUniverse(false);
    }
  };

  // Structured SSE Candidate Event Handler (Single Source of Truth)
  const handleCandidateUpdate = (candidateUpdate: any) => {
    if (!candidateUpdate || !candidateUpdate.ticker) return;
    setRun(current => {
      const prev = current!; // stream events only arrive after the run state is created
      const results = [...prev.results];
      const funnel = { ...prev.funnel };
      const idx = results.findIndex(r => r.ticker === candidateUpdate.ticker);

      if (idx === -1) {
        results.push({
          ticker: candidateUpdate.ticker,
          final_decision: candidateUpdate.final_decision || "EVALUATING...",
          g3_direction: candidateUpdate.g3_direction ?? null,
          g3_confidence: candidateUpdate.g3_confidence ?? null,
          ev: candidateUpdate.ev ?? null,
          win_prob: candidateUpdate.win_prob ?? null,
          position_confidence: candidateUpdate.position_confidence ?? null,
          trade_levels: candidateUpdate.trade_levels ?? null,
          risk_sizing: candidateUpdate.risk_sizing ?? null,
          risk_reject_reason: candidateUpdate.risk_reject_reason ?? null,
          notes: candidateUpdate.notes || "Evaluating candidate...",
          ...candidateUpdate
        });
      } else {
        results[idx] = {
          ...results[idx],
          ...candidateUpdate,
          g3_direction: candidateUpdate.g3_direction !== undefined ? candidateUpdate.g3_direction : results[idx].g3_direction,
          g3_confidence: candidateUpdate.g3_confidence !== undefined ? candidateUpdate.g3_confidence : results[idx].g3_confidence,
          ev: candidateUpdate.ev !== undefined ? candidateUpdate.ev : results[idx].ev,
          win_prob: candidateUpdate.win_prob !== undefined ? candidateUpdate.win_prob : results[idx].win_prob,
          position_confidence: candidateUpdate.position_confidence !== undefined ? candidateUpdate.position_confidence : results[idx].position_confidence,
          trade_levels: candidateUpdate.trade_levels !== undefined ? candidateUpdate.trade_levels : results[idx].trade_levels,
          risk_sizing: candidateUpdate.risk_sizing !== undefined ? candidateUpdate.risk_sizing : results[idx].risk_sizing,
          risk_reject_reason: candidateUpdate.risk_reject_reason !== undefined ? candidateUpdate.risk_reject_reason : results[idx].risk_reject_reason,
          notes: candidateUpdate.notes || results[idx].notes
        };
      }

      funnel.processed_count = results.length;
      funnel.gate5_buy_count = results.filter(r => r.final_decision === 'BUY' || r.final_decision?.startsWith('PLACED') || r.final_decision === 'QUEUED_MARKET_CLOSED' || r.final_decision?.startsWith('EXEC_FAILED') || r.final_decision?.startsWith('REJECTED_RISK')).length;
      funnel.approved_count = results.filter(r => r.final_decision === 'BUY' || r.final_decision?.startsWith('PLACED') || r.final_decision === 'QUEUED_MARKET_CLOSED').length;
      funnel.placed_count = results.filter(r => r.final_decision?.startsWith('PLACED') || r.final_decision === 'QUEUED_MARKET_CLOSED').length;

      return {
        ...prev,
        funnel,
        results
      };
    });
  };

  // A run starts with nothing measured yet; counts go up as candidates are processed
  const startRunState = (): RunState => ({
    timestamp: null,
    funnel: { scanned_count: null, processed_count: 0, gate5_buy_count: 0, approved_count: 0, placed_count: 0 },
    results: [],
    market: null,
  });

  // A run's final result (Python's latest_run.json): the only source of its totals and market snapshot
  const applyRunResult = (result: any) => {
    setUniverseCount(result.funnel.universe_count);
    setRun({
      timestamp: new Date().toISOString(),
      funnel: {
        scanned_count: result.funnel.scanned_count,
        processed_count: result.funnel.processed_count,
        gate5_buy_count: result.funnel.gate5_buy_count,
        approved_count: result.funnel.approved_count,
        placed_count: result.funnel.placed_count,
      },
      results: result.results,
      market: {
        vix_level: result.portfolio.vix_level,
        spy_change_pct: result.portfolio.spy_change_pct,
        hours_to_next_macro: result.portfolio.hours_to_next_macro,
      },
    });
  };

  // When the stream ends without a result (e.g. the run failed), the run keeps what was streamed and gets its end time
  const markRunFinished = () => {
    setRun(current => ({ ...current!, timestamp: current!.timestamp ?? new Date().toISOString() }));
  };

  // Run Real Python Pipeline: create the run (POST, recorded in Neon pipeline_runs), then subscribe to its stream (GET)
  const triggerDryRun = async (runUniverse: boolean = false) => {
    setIsRunning(true);
    setRunLog([]);
    setPipelineRunError(null);

    // Auto-sync live portfolio at the start of scanner run
    refreshPortfolio(false);

    setRun(startRunState());

    let streamUrl: string;
    try {
      const res = await fetch('/api/pipeline/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_universe: runUniverse,
          place_orders: placeOrders,
          ignore_market_hours: ignoreMarketHours,
        }),
      });
      const runSession = await res.json();
      if (!res.ok) {
        throw new Error(runSession.error);
      }
      streamUrl = runSession.stream_url;
    } catch (err: any) {
      setPipelineRunError(`Failed to start pipeline run: ${err.message}`);
      setPipelineErrorExpanded(true);
      setIsRunning(false);
      setRun(null);
      return;
    }

    // Connect to SSE stream
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.candidate) {
          handleCandidateUpdate(data.candidate);
        }
        if (data.log) {
          setRunLog(prev => [...prev, data.log]);
        } else if (data.result) {
          applyRunResult(data.result);
          showToast("Pipeline executed successfully! Telemetry updated from python backend.");
          // Auto-sync portfolio immediately after pipeline finishes
          refreshPortfolio(false);
        } else if (data.error) {
          setPipelineRunError(data.error);
          setPipelineErrorExpanded(true);
          showToast(`Pipeline Error: ${data.error.slice(0, 80)}...`);
          refreshPortfolio(false);
        } else if (data.done) {
          eventSource.close();
          setIsRunning(false);
          markRunFinished();
          // Ensure live portfolio is synced once stream ends
          refreshPortfolio(false);
        }
      } catch (err) {
        console.error("Error parsing SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE connection closed or error encountered:", err);
      eventSource.close();
      setIsRunning(false);
      refreshPortfolio(false);
    };
  };

  // Dial edit handler (value already converted back to stored units by StrategyDials)
  const handleDialChange = (group: keyof Dials, section: string, field: string, value: number) => {
    setTempDials(prev => {
      const next = structuredClone(prev!);
      (next[group] as Record<string, Record<string, number>>)[section][field] = value;
      return next;
    });
  };

  // Compare edited values with the saved ones to create a Propose summary
  const proposeChanges = () => {
    setProposedDiff(diffDials(dials!, tempDials!));
    setShowConfirmModal(true);
  };

  // POST /api/configs — save the dials as a new version of the named preset and make it the active one
  const confirmAndSaveDials = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: strategyName.trim(),
          is_default: true,
          selection_params: tempDials!.selection_params,
          money_params: tempDials!.money_params,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDials(structuredClone(tempDials));
        setShowConfirmModal(false);
        showToast(`Strategy '${data.data.name}' (v${data.data.version}) saved to database.`);
      } else {
        showToast(`Failed to save config: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Error saving config: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const discardDials = () => {
    setTempDials(structuredClone(dials));
    showToast("Changes discarded. Reverted dials to the last saved state.");
  };

  // Without the active config from Neon there is nothing to run; stop here and show why
  if (!dials || !tempDials) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        {configError
          ? <ErrorNotice layout="inset" title="Strategy config not loaded:" message={configError} />
          : <p className="text-sm text-slate-400">Loading strategy config from Neon…</p>}
      </div>
    );
  }

  return (
    <div id="applet_main" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* SUCCESS TOAST NOTIFIER */}
      {successToast && (
        <div id="success_toast" className="fixed bottom-6 right-6 z-50 bg-teal-500 text-slate-950 px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce border border-teal-300">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium text-sm">{successToast}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header id="cockpit_header" className={`border-b sticky top-0 z-30 transition-all duration-300 ${
        placeOrders 
          ? 'bg-slate-950 border-red-500/40 shadow-lg shadow-red-950/30' 
          : 'bg-slate-950 border-slate-800'
      }`}>

        {/* MOBILE COMPACT HEADER BAR (md:hidden) */}
        <div className="md:hidden px-3 py-2 flex items-center justify-between gap-2">
          {/* Left: Brand & Mode */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded border ${
              placeOrders ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
            }`}>
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-100 truncate">Cockpit</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                  placeOrders 
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' 
                    : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                }`}>
                  {placeOrders ? 'LIVE' : 'SIM'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Portfolio Summary Badge + Tab Switcher + Drawer Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Portfolio Badge (Clicking toggles drawer) */}
            <PortfolioSummary
              layout="compact"
              portfolio={portfolio}
              market={run ? run.market : null}
              macroBlockHours={dials.selection_params.gate1.macro_hours}
              maxPositions={dials.money_params.portfolio_limits.MAX_OPEN_POSITIONS}
              isFetching={isFetchingPortfolio}
              lastSync={portfolioLastSync}
              error={portfolioError}
              onSync={syncPortfolio}
              onOpen={() => setMobileMenuOpen(!mobileMenuOpen)}
            />

            {/* Mobile Tab Switcher */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                id="mobile_tab_last_run"
                onClick={() => setActiveTab('last_run')}
                className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 ${
                  activeTab === 'last_run' ? 'bg-slate-800 text-teal-400 font-medium' : 'text-slate-400'
                }`}
                title="Last Run Telemetry"
              >
                <Activity className="h-3.5 w-3.5" />
              </button>
              <button
                id="mobile_tab_config"
                onClick={() => setActiveTab('config')}
                className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 ${
                  activeTab === 'config' ? 'bg-slate-800 text-teal-400 font-medium' : 'text-slate-400'
                }`}
                title="Strategy Dials"
              >
                <Sliders className="h-3.5 w-3.5" />
              </button>
              <button
                id="mobile_tab_spec"
                onClick={() => setActiveTab('spec')}
                className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 ${
                  activeTab === 'spec' ? 'bg-slate-800 text-teal-400 font-medium' : 'text-slate-400'
                }`}
                title="Design Spec"
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Drawer Toggle Chevron Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-1.5 rounded border transition-colors ${
                mobileMenuOpen 
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' 
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
              aria-label="Toggle Mobile Controls Drawer"
            >
              {mobileMenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* MOBILE EXPANDABLE DRAWER SHEET (md:hidden) */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-t border-slate-800 p-3 space-y-3 animate-in slide-in-from-top duration-200 shadow-2xl max-h-[80vh] overflow-y-auto">
            <OrderToggles
              placeOrders={placeOrders}
              ignoreMarketHours={ignoreMarketHours}
              setPlaceOrders={setPlaceOrders}
              setIgnoreMarketHours={setIgnoreMarketHours}
              showToast={showToast}
            />

            <PortfolioSummary
              layout="drawer"
              portfolio={portfolio}
              market={run ? run.market : null}
              macroBlockHours={dials.selection_params.gate1.macro_hours}
              maxPositions={dials.money_params.portfolio_limits.MAX_OPEN_POSITIONS}
              isFetching={isFetchingPortfolio}
              lastSync={portfolioLastSync}
              error={portfolioError}
              onSync={syncPortfolio}
            />
          </div>
        )}

        {/* DESKTOP HEADER LAYOUT (hidden md:block) */}
        <div className="hidden md:block">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border transition-all ${
                placeOrders ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
              }`}>
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors ${
                    placeOrders 
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' 
                      : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                  }`}>
                    {placeOrders ? '🔴 LIVE ORDERS ACTIVE' : 'v0 simplest'}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {placeOrders ? 'Real Alpaca Execution' : 'Sandbox / Simulation'}
                  </span>
                </div>
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">Trading Bot Cockpit</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              
              <OrderToggles
                placeOrders={placeOrders}
                ignoreMarketHours={ignoreMarketHours}
                setPlaceOrders={setPlaceOrders}
                setIgnoreMarketHours={setIgnoreMarketHours}
                showToast={showToast}
                withIds
              />
              {/* Nav Tabs */}
              <nav className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button 
                  id="tab_last_run"
                  onClick={() => setActiveTab('last_run')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'last_run' ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  Last Run Telemetry
                </button>
                <button 
                  id="tab_config"
                  onClick={() => setActiveTab('config')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'config' ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Strategy Dials
                </button>
                <button 
                  id="tab_spec"
                  onClick={() => setActiveTab('spec')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'spec' ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Design Spec
                </button>
              </nav>
            </div>
          </div>

          <PortfolioSummary
            layout="banner"
            portfolio={portfolio}
            market={run ? run.market : null}
            macroBlockHours={dials.selection_params.gate1.macro_hours}
            maxPositions={dials.money_params.portfolio_limits.MAX_OPEN_POSITIONS}
            isFetching={isFetchingPortfolio}
            lastSync={portfolioLastSync}
            error={portfolioError}
            onSync={syncPortfolio}
            liveTrades={placeOrders}
          />
        </div>

        <PortfolioSummary
          layout="error"
          portfolio={portfolio}
          market={run ? run.market : null}
          macroBlockHours={dials.selection_params.gate1.macro_hours}
          maxPositions={dials.money_params.portfolio_limits.MAX_OPEN_POSITIONS}
          isFetching={isFetchingPortfolio}
          lastSync={portfolioLastSync}
          error={portfolioError}
          onSync={syncPortfolio}
        />

        {/* Pipeline Run Execution Error Banner */}
        {pipelineRunError && (
          <div id="pipeline_error_banner" className="bg-rose-950/95 border-t border-b border-rose-800 text-rose-200 px-3 py-2.5 sm:px-4 text-xs shadow-lg w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 animate-pulse mt-0.5 sm:mt-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-rose-300 uppercase tracking-wide text-[11px] sm:text-xs">
                    Pipeline Execution Error
                  </span>
                  {!pipelineErrorExpanded && (
                    <span className="ml-2 font-mono text-rose-100 text-[11px] break-words">
                      {pipelineRunError.split('\n')[0]} {pipelineRunError.includes('\n') ? '...' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn_copy_traceback"
                  onClick={() => {
                    navigator.clipboard.writeText(pipelineRunError);
                    setCopiedError(true);
                    setTimeout(() => setCopiedError(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-rose-200 hover:text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 border border-rose-800/80 transition-all cursor-pointer"
                  title="Copy full error traceback to clipboard"
                >
                  {copiedError ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedError ? 'Copied' : 'Copy Traceback'}
                </button>

                <button
                  id="btn_toggle_error_expand"
                  onClick={() => setPipelineErrorExpanded(!pipelineErrorExpanded)}
                  className="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-100 rounded text-[11px] font-semibold flex items-center justify-center gap-1 border border-rose-700 transition-all cursor-pointer"
                >
                  {pipelineErrorExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {pipelineErrorExpanded ? 'Hide Traceback' : 'View Full Details'}
                </button>

                <button 
                  id="btn_dismiss_pipeline_error"
                  onClick={() => setPipelineRunError(null)}
                  className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-rose-100 rounded text-[11px] font-semibold flex items-center justify-center gap-1 border border-rose-700 transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Expandable full traceback display */}
            {pipelineErrorExpanded && (
              <div className="mt-2.5 pt-2.5 border-t border-rose-900/60">
                <div className="text-[10px] text-rose-400 font-semibold mb-1 uppercase tracking-wider">Complete Error Traceback:</div>
                <pre className="p-3 bg-black/80 rounded-lg border border-rose-900/80 font-mono text-[11px] text-rose-100 overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto select-text scrollbar-thin leading-relaxed">
                  {pipelineRunError}
                </pre>
              </div>
            )}
          </div>
        )}

      </header>

      {/* CORE VIEW */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* TAB 1: LAST RUN TELEMETRY */}
        {activeTab === 'last_run' && (
          <LastRun
            universeCount={universeCount}
            run={run}
            formattedTimestamp={formatToLocalDisplay(run ? run.timestamp : null)}
            running={isRunning}
            buildingWatchlist={isGeneratingUniverse}
            liveOrders={placeOrders}
            log={runLog}
            stopMultiplier={dials.money_params.trade_risk.atr_stop_multiplier}
            onViewList={openUniverseModal}
            onLoadWatchlist={handleLoadWatchlist}
            onRunScanner={() => triggerDryRun(false)}
          />
        )}

        {activeTab === 'config' && (
          <StrategyDials
            dials={tempDials}
            onChange={handleDialChange}
            onDiscard={discardDials}
            onPropose={proposeChanges}
          />
        )}

        {activeTab === 'spec' && <DesignSpec />}

      </main>

      {showConfirmModal && (
        <ProposeDiff
          diffs={proposedDiff}
          strategyName={strategyName}
          onStrategyNameChange={setStrategyName}
          saving={isSavingConfig}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={confirmAndSaveDials}
        />
      )}

      {showUniverseModal && (
        <UniverseList
          items={universeData}
          fetching={isFetchingUniverse}
          error={universeError}
          generating={isGeneratingUniverse}
          onRefresh={openUniverseModal}
          onGenerate={handleLoadWatchlist}
          onClose={() => setShowUniverseModal(false)}
        />
      )}

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-850 py-4 mt-auto text-center text-xs text-slate-500">
        <p>© 2026 Trading Bot Cockpit • Design Specification Playground Cockpit v0</p>
      </footer>

    </div>
  );
}

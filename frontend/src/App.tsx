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
import type { Telemetry } from './types/telemetry';
import type { UniverseItem } from './types/universe';
import { DesignSpec } from './screens/DesignSpec';
import { LastRun } from './screens/LastRun';
import { StrategyDials } from './screens/StrategyDials';
import type { DialDiff, Dials, StrategyConfig } from './types/dials';
import { diffDials } from './utils/strategyDials';
import { ErrorNotice } from './components/ui/error-notice';

// Initial Mock Telemetry Data
const initialTelemetry: Telemetry = {
  timestamp: null,
  portfolio: {
    value: 100000.00,
    daily_pnl: 1250.00,
    daily_pnl_pct: 1.25,
    open_positions: 2,
    max_positions: 10,
    drawdown_pct: 1.5,
    vix_level: 14.50,
    spy_change_pct: 0.45,
    hours_to_next_macro: 4.5
  },
  funnel: {
    universe_count: 62,
    scanned_count: 15,
    processed_count: 10,
    gate5_buy_count: 3,
    approved_count: 3,
    placed_count: 0
  },
  results: [
    {
      ticker: "COF",
      final_decision: "BUY",
      g3_direction: "BULLISH",
      g3_confidence: 8,
      ev: 0.084,
      win_prob: 0.58,
      position_confidence: "HIGH",
      trade_levels: {
        entry: 135.00,
        stop: 129.50,
        target: 146.00,
        reward_risk: 2.0
      },
      risk_sizing: {
        shares: 39,
        position_value: 5265.00,
        position_pct: 5.26
      },
      risk_reject_reason: null,
      notes: "Strong macro momentum, sector bullish breakout"
    },
    {
      ticker: "MSFT",
      final_decision: "BUY",
      g3_direction: "BULLISH",
      g3_confidence: 9,
      ev: 0.065,
      win_prob: 0.52,
      position_confidence: "HIGH",
      trade_levels: {
        entry: 420.00,
        stop: 411.50,
        target: 437.00,
        reward_risk: 2.0
      },
      risk_sizing: {
        shares: 12,
        position_value: 5040.00,
        position_pct: 5.04
      },
      risk_reject_reason: null,
      notes: "Cloud business growth outperforming, passed Gate 4 sentiment convergence"
    },
    {
      ticker: "NVDA",
      final_decision: "BLOCKED_G1:sector",
      g3_direction: null,
      g3_confidence: null,
      ev: null,
      win_prob: null,
      position_confidence: null,
      trade_levels: null,
      risk_sizing: null,
      risk_reject_reason: "Sector premarket gap exceeds limit",
      notes: "Gate 1 rule block: Semiconductor sector drop is wider than standard safety margins"
    },
    {
      ticker: "AMD",
      final_decision: "BLOCKED_G3",
      g3_direction: "NEUTRAL",
      g3_confidence: 4,
      ev: null,
      win_prob: null,
      position_confidence: null,
      trade_levels: null,
      risk_sizing: null,
      risk_reject_reason: "Gate 3 AI sentiment confidence too low",
      notes: "Gate 3 Claude block: Sentiment direction neutral with insufficient score (4/10)"
    },
    {
      ticker: "BNY",
      final_decision: "SKIP",
      g3_direction: "BULLISH",
      g3_confidence: 6,
      ev: 0.012,
      win_prob: 0.38,
      position_confidence: "LOW",
      trade_levels: {
        entry: 80.00,
        stop: 78.50,
        target: 83.00,
        reward_risk: 2.0
      },
      risk_sizing: null,
      risk_reject_reason: "Expected Value (1.2%) below 4.0% minimum threshold",
      notes: "Gate 5 rule skip: Survived intelligence gates but failed minimum expected value criteria"
    },
    {
      ticker: "AAPL",
      final_decision: "BLOCKED_G2",
      g3_direction: "BEARISH",
      g3_confidence: 7,
      ev: null,
      win_prob: null,
      position_confidence: null,
      trade_levels: null,
      risk_sizing: null,
      risk_reject_reason: "Active hard news threat detected",
      notes: "Gate 2 news block: Negative litigation updates flagged on Bloomberg feed"
    }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'last_run' | 'config' | 'spec'>('last_run');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
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

  // Portfolio live state
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [pipelineRunError, setPipelineRunError] = useState<string | null>(null);
  const [pipelineErrorExpanded, setPipelineErrorExpanded] = useState<boolean>(true);
  const [copiedError, setCopiedError] = useState<boolean>(false);
  const [isFetchingPortfolio, setIsFetchingPortfolio] = useState<boolean>(false);
  const [portfolioLastSync, setPortfolioLastSync] = useState<string | null>(null);

  // Helper to format timestamp as YYYY-MM-DD HH:MM:SS in Local Timezone
  const formatTimestamp = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Converts any UTC / ISO / datetime string into the user's local timezone format
  const formatToLocalDisplay = (rawTimestamp: string | null | undefined) => {
    if (!rawTimestamp) return "—";
    try {
      let d: Date;
      if (rawTimestamp.includes('T') || rawTimestamp.endsWith('Z')) {
        d = new Date(rawTimestamp);
      } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(rawTimestamp)) {
        const utcDate = new Date(rawTimestamp.replace(' ', 'T') + 'Z');
        d = !isNaN(utcDate.getTime()) ? utcDate : new Date(rawTimestamp);
      } else {
        d = new Date(rawTimestamp);
      }

      if (isNaN(d.getTime())) {
        return rawTimestamp;
      }
      return formatTimestamp(d);
    } catch {
      return rawTimestamp;
    }
  };

  // Fetch live portfolio directly from Alpaca API
  const fetchLivePortfolio = async (showNotification: boolean = false) => {
    setIsFetchingPortfolio(true);
    setPortfolioError(null);
    try {
      const res = await fetch('/api/portfolio/live');
      const data = await res.json();
      if (res.ok && data.success) {
        const syncTime = formatTimestamp();
        setPortfolioLastSync(syncTime);
        setTelemetry(prev => ({
          ...prev,
          portfolio: {
            ...prev.portfolio,
            value: data.value,
            daily_pnl: data.daily_pnl,
            daily_pnl_pct: data.daily_pnl_pct,
            open_positions: data.open_positions,
            drawdown_pct: data.drawdown_pct
          }
        }));
        if (showNotification) {
          showToast(`Alpaca portfolio synchronized at ${syncTime}`);
        }
      } else {
        setPortfolioError(data.error || 'Failed to connect to Alpaca API');
      }
    } catch (err: any) {
      setPortfolioError(`Network error fetching Alpaca portfolio: ${err.message}`);
    } finally {
      setIsFetchingPortfolio(false);
    }
  };

  // Manual "Update Portfolio": record a snapshot in Neon (POST), then refresh the live view (GET)
  const syncPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_source: 'MANUAL_UPDATE' }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(`Snapshot not saved: ${data.details}`);
      }
    } catch (err: any) {
      showToast(`Snapshot not saved: ${err.message}`);
    }
    fetchLivePortfolio(true);
  };

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

  // Fetch the latest telemetry run from backend on page load
  useEffect(() => {
    loadActiveConfig();
    fetchLivePortfolio();

    fetch('/api/run/latest')
      .then(res => {
        if (!res.ok) throw new Error('No latest run data found');
        return res.json();
      })
      .then(data => {
        if (data && data.timestamp) {
          setTelemetry(prev => ({
            ...data,
            portfolio: prev.portfolio.value !== 100000.00 ? prev.portfolio : data.portfolio
          }));
        }
      })
      .catch(err => {
        console.warn("Could not load latest telemetry:", err);
      });
  }, []);

  // Handler for Stage 1: Load Watchlist / Generate Universe
  const handleLoadWatchlist = async () => {
    setIsGeneratingUniverse(true);
    // Immediately clear previous timestamp and reset downstream counters
    setTelemetry(prev => ({
      ...prev,
      timestamp: null,
      funnel: {
        ...prev.funnel,
        scanned_count: 0,
        processed_count: 0,
        gate5_buy_count: 0,
        approved_count: 0,
        placed_count: 0
      },
      results: []
    }));
    try {
      const res = await fetch('/api/universe/generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTelemetry(prev => ({
          ...prev,
          timestamp: new Date().toISOString(),
          funnel: {
            ...prev.funnel,
            universe_count: data.count,
            scanned_count: 0,
            processed_count: 0,
            gate5_buy_count: 0,
            approved_count: 0,
            placed_count: 0
          },
          results: []
        }));
        showToast(`Universe generated! ${data.count} tickers saved to universe.json. Stages 2–6 reset.`);
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
    setTelemetry(prev => {
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

  // Live SSE stdout log parser as fallback for text streams
  const parseLiveLogLine = (logLine: string) => {
    if (!logLine) return;

    setTelemetry(prev => {
      let results = [...prev.results];
      let funnel = { ...prev.funnel };
      let updated = false;

      // 1. Candidate start: "[pipeline] processing candidate 1: NVDA (Sector: ...)"
      const mStart = logLine.match(/\[pipeline\] processing candidate \d+: ([A-Z0-9]+)/);
      if (mStart) {
        const ticker = mStart[1];
        const existingIdx = results.findIndex(r => r.ticker === ticker);
        if (existingIdx === -1) {
          results.push({
            ticker,
            final_decision: "EVALUATING...",
            g3_direction: null,
            g3_confidence: null,
            ev: null,
            win_prob: null,
            position_confidence: null,
            trade_levels: null,
            risk_sizing: null,
            risk_reject_reason: null,
            notes: "Evaluating candidate..."
          });
          funnel.processed_count = (funnel.processed_count || 0) + 1;
          updated = true;
        }
      }

      // 2. Gate 1 Blocked: "[gate1] NVDA: BLOCKED — reason"
      const mG1Block = logLine.match(/\[gate1\] ([A-Z0-9]+): BLOCKED — (.*)/);
      if (mG1Block) {
        const [, ticker, reason] = mG1Block;
        const idx = results.findIndex(r => r.ticker === ticker);
        const decision = `BLOCKED_G1:${reason.toLowerCase().includes('gap') ? 'premarket_gap' : 'hard_threat'}`;
        if (idx !== -1) {
          results[idx] = { ...results[idx], final_decision: decision, notes: `Gate 1: ${reason}` };
        } else {
          results.push({
            ticker,
            final_decision: decision,
            g3_direction: null, g3_confidence: null, ev: null, win_prob: null, position_confidence: null, trade_levels: null, risk_sizing: null, risk_reject_reason: null,
            notes: `Gate 1: ${reason}`
          });
        }
        updated = true;
      }

      // 3. Gate 1 Passed: "[gate1] NVDA: passed all 8 checks"
      const mG1Pass = logLine.match(/\[gate1\] ([A-Z0-9]+): passed all 8 checks/);
      if (mG1Pass) {
        const ticker = mG1Pass[1];
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1 && results[idx].final_decision === 'EVALUATING...') {
          results[idx] = { ...results[idx], final_decision: 'PASSED_G1', notes: 'Gate 1 passed' };
          updated = true;
        }
      }

      // 4. Gate 2 Blocked: "[gate2] NVDA: BLOCKED — reason"
      const mG2Block = logLine.match(/\[gate2\] ([A-Z0-9]+): BLOCKED — (.*)/);
      if (mG2Block) {
        const [, ticker, reason] = mG2Block;
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = { ...results[idx], final_decision: 'BLOCKED_G2', notes: `Gate 2: ${reason}` };
          updated = true;
        }
      }

      // 5. Gate 2 Passed: "[gate2] NVDA: Passed news safety checks."
      const mG2Pass = logLine.match(/\[gate2\] ([A-Z0-9]+): Passed news safety checks/);
      if (mG2Pass) {
        const ticker = mG2Pass[1];
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = { ...results[idx], final_decision: 'PASSED_G2', notes: 'Gate 2 passed' };
          updated = true;
        }
      }

      // 6. Gate 3 Sentiment: "[gate3] NVDA: BULLISH conf=7" or "[gate3] NVDA: BLOCKED — NEUTRAL conf=5: ..."
      const mG3Sentiment = logLine.match(/\[gate3\] ([A-Z0-9]+): (BULLISH|NEUTRAL|BEARISH) conf=(\d+)/);
      if (mG3Sentiment) {
        const [, ticker, dir, conf] = mG3Sentiment;
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = {
            ...results[idx],
            g3_direction: dir,
            g3_confidence: Number(conf)
          };
          updated = true;
        }
      }

      const mG3Block = logLine.match(/\[gate3\] ([A-Z0-9]+): BLOCKED — (.*)/);
      if (mG3Block) {
        const [, ticker, reason] = mG3Block;
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = { ...results[idx], final_decision: 'BLOCKED_G3', notes: `Gate 3: ${reason}` };
          updated = true;
        }
      }

      // 7. Gate 5 Buy Signal: "[gate5] NVDA: BUY — EV 0.688 | win_prob=56%"
      const mG5Buy = logLine.match(/\[gate5\] ([A-Z0-9]+): BUY — EV ([\d\.]+) \| win_prob=(\d+)%/);
      if (mG5Buy) {
        const [, ticker, evVal, winProbVal] = mG5Buy;
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = {
            ...results[idx],
            final_decision: 'BUY',
            ev: Number(evVal),
            win_prob: Number(winProbVal) / 100,
            notes: 'Gate 5 Buy Signal generated'
          };
          funnel.gate5_buy_count = (funnel.gate5_buy_count || 0) + 1;
          updated = true;
        }
      }

      // 8. Risk Sizing Approved: "[risk] NVDA: APPROVED — 36 shares ($8,000.00, 8.0% of portfolio)"
      const mRiskApprove = logLine.match(/\[risk\] ([A-Z0-9]+): APPROVED — (\d+) shares \(\$([\d\.,]+), ([\d\.]+)% of portfolio\)/);
      if (mRiskApprove) {
        const [, ticker, shares, valStr, pct] = mRiskApprove;
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = {
            ...results[idx],
            risk_sizing: {
              shares: Number(shares),
              position_value: Number(valStr.replace(/,/g, '')),
              position_pct: Number(pct)
            }
          };
          funnel.approved_count = (funnel.approved_count || 0) + 1;
          updated = true;
        }
      }

      // 9. Executor Failed: "[executor] ❌ NVDA: Execution failed — ..." or "[executor] ❌ NVDA: ..."
      const mExecFail = logLine.match(/\[executor\] ❌ ([A-Z0-9]+): Execution failed —? (.*)/) || logLine.match(/\[executor\] ❌ ([A-Z0-9]+): (.*)/);
      if (mExecFail) {
        const [, ticker, reason] = mExecFail;
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = {
            ...results[idx],
            final_decision: 'EXEC_FAILED',
            exec_error: reason,
            notes: `Execution Failed: ${reason}`
          };
          updated = true;
        }
      }

      // 10. Executor Placed / Queued
      const mExecPlaced = logLine.match(/\[executor\] ([A-Z0-9]+): Order filled successfully! Decision: (.*)/);
      if (mExecPlaced) {
        const [, ticker, dec] = mExecPlaced;
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = { ...results[idx], final_decision: dec, notes: 'Order filled on Alpaca' };
          funnel.placed_count = (funnel.placed_count || 0) + 1;
          updated = true;
        }
      }

      const mExecQueued = logLine.match(/\[executor\] ([A-Z0-9]+): Order accepted & queued for market open! Decision: (.*)/);
      if (mExecQueued) {
        const [, ticker, dec] = mExecQueued;
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = { ...results[idx], final_decision: dec, notes: 'Order accepted & queued for market open' };
          funnel.placed_count = (funnel.placed_count || 0) + 1;
          updated = true;
        }
      }

      if (!updated) return prev;
      return {
        ...prev,
        funnel,
        results
      };
    });
  };

  // Run Real Python Pipeline: create the run (POST, recorded in Neon pipeline_runs), then subscribe to its stream (GET)
  const triggerDryRun = async (runUniverse: boolean = false) => {
    setIsRunning(true);
    setRunLog([]);
    setPipelineRunError(null);

    // Auto-sync live portfolio at the start of scanner run
    fetchLivePortfolio(false);

    // Clear previous timestamp so it disappears while running, reset funnel progress
    setTelemetry(prev => ({
      ...prev,
      timestamp: null,
      funnel: {
        ...prev.funnel,
        scanned_count: 0,
        processed_count: 0,
        gate5_buy_count: 0,
        approved_count: 0,
        placed_count: 0
      },
      results: []
    }));
    
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
          parseLiveLogLine(data.log);
        } else if (data.result) {
          const completionTimestamp = new Date().toISOString();
          setTelemetry({
            ...data.result,
            timestamp: completionTimestamp
          });
          showToast("Pipeline executed successfully! Telemetry updated from python backend.");
          // Auto-sync portfolio immediately after pipeline finishes
          fetchLivePortfolio(false);
        } else if (data.error) {
          setPipelineRunError(data.error);
          setPipelineErrorExpanded(true);
          showToast(`Pipeline Error: ${data.error.slice(0, 80)}...`);
          fetchLivePortfolio(false);
        } else if (data.done) {
          eventSource.close();
          setIsRunning(false);
          // Set timestamp upon finish if not already set by data.result
          setTelemetry(prev => ({
            ...prev,
            timestamp: prev.timestamp || new Date().toISOString()
          }));
          // Ensure live portfolio is synced once stream ends
          fetchLivePortfolio(false);
        }
      } catch (err) {
        console.error("Error parsing SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE connection closed or error encountered:", err);
      eventSource.close();
      setIsRunning(false);
      fetchLivePortfolio(false);
    };
  };

  // Zero-Cost Fast Replay for instant UI testing ($0 LLM Token Cost)
  const triggerFastReplay = () => {
    setIsRunning(true);
    setRunLog([]);
    setPipelineRunError(null);

    // Auto-sync live portfolio at the start of fast replay
    fetchLivePortfolio(false);

    // Clear previous timestamp so it disappears while running
    setTelemetry(prev => ({
      ...prev,
      timestamp: null,
      funnel: {
        ...prev.funnel,
        scanned_count: 0,
        processed_count: 0,
        gate5_buy_count: 0,
        approved_count: 0,
        placed_count: 0
      },
      results: []
    }));

    const eventSource = new EventSource('/api/pipeline/replay');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.candidate) {
          handleCandidateUpdate(data.candidate);
        }
        if (data.log) {
          setRunLog(prev => [...prev, data.log]);
          parseLiveLogLine(data.log);
        } else if (data.result) {
          const completionTimestamp = new Date().toISOString();
          setTelemetry({
            ...data.result,
            timestamp: completionTimestamp
          });
          showToast("⚡ Replay complete! Data loaded ($0 Token Cost).");
          fetchLivePortfolio(false);
        } else if (data.error) {
          setPipelineRunError(data.error);
          setPipelineErrorExpanded(true);
          fetchLivePortfolio(false);
        } else if (data.done) {
          eventSource.close();
          setIsRunning(false);
          setTelemetry(prev => ({
            ...prev,
            timestamp: prev.timestamp || new Date().toISOString()
          }));
          fetchLivePortfolio(false);
        }
      } catch (err) {
        console.error("Error parsing replay SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("Replay SSE connection ended:", err);
      eventSource.close();
      setIsRunning(false);
      fetchLivePortfolio(false);
    };
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
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
              portfolio={telemetry.portfolio}
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
              portfolio={telemetry.portfolio}
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
            portfolio={telemetry.portfolio}
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
          portfolio={telemetry.portfolio}
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
            counts={telemetry.funnel}
            formattedTimestamp={formatToLocalDisplay(telemetry.timestamp)}
            running={isRunning}
            buildingWatchlist={isGeneratingUniverse}
            liveOrders={placeOrders}
            log={runLog}
            rows={telemetry.results}
            stopMultiplier={dials.money_params.trade_risk.atr_stop_multiplier}
            onViewList={openUniverseModal}
            onLoadWatchlist={handleLoadWatchlist}
            onFastReplay={triggerFastReplay}
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

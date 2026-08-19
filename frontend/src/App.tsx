import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Settings, 
  Activity, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Sliders, 
  ArrowRight, 
  Check, 
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Layers,
  Sparkles,
  Loader2,
  RefreshCw,
  Search,
  Eye,
  ArrowUpDown,
  X,
  Clock,
  Copy
} from 'lucide-react';
import { MarketClockBadge } from './components/MarketClockBadge';

// Initial Mock Telemetry Data
const initialTelemetry = {
  timestamp: null as string | null,
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

// Initial Strategy Dials directly mapped from backend/config.py
const initialDials = {
  universe: {
    MIN_PRICE: 10.0,
    MIN_MARKET_CAP_BILLIONS: 100.0, // represented in Billions for readability
    MIN_ATR_PCT: 1.0,
    MAX_ATR_PCT: 5.0,
    EARNINGS_WINDOW_DAYS: 5
  },
  scanner: {
    TOP_N: 15,
    MIN_SCORE: 2,
    RSI_MIN: 50,
    RSI_MAX: 70
  },
  gate1: {
    vix_level_limit: 30.0,
    spy_change_pct_limit: -1.5,
    sector_change_pct_limit: -2.0,
    premarket_gap_pct_limit: 3.0,
    macro_hours_threshold: 2.0,
    loss_limit_pct_limit: 3.0
  },
  gate3: {
    MIN_CONFIDENCE: 6
  },
  gate5: {
    WIN_PROB_BASE: 35.0, // stored as %
    MIN_EDGE_PCT: 4.0 // stored as %
  },
  risk: {
    MAX_OPEN_POSITIONS: 10,
    MAX_DAILY_LOSS_PCT: 3.0,
    MAX_DRAWDOWN_PCT: 8.0,
    KELLY_FRACTION: 0.25
  },
  geometry: {
    atr_stop_multiplier: 1.5,
    target_rr_multiple: 2.0
  }
};

interface FunnelStageCardProps {
  stepTitle: string;
  count: number;
  subtitle: string;
  isLoading: boolean;
  loadingLabel?: string;
  accentColor?: 'teal' | 'emerald' | 'red';
  isLiveOrder?: boolean;
  extraAction?: React.ReactNode;
}

function FunnelStageCard({
  stepTitle,
  count,
  subtitle,
  isLoading,
  loadingLabel = "Evaluating...",
  accentColor = "teal",
  isLiveOrder = false,
  extraAction,
}: FunnelStageCardProps) {
  // If actively running and count is still 0, show evaluating spinner
  const showSpinner = isLoading && count === 0;

  const colorClasses: Record<string, string> = {
    teal: 'text-teal-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
  };

  const glowClasses: Record<string, string> = {
    teal: 'bg-teal-500/5',
    emerald: 'bg-emerald-500/5',
    red: 'bg-red-500/10',
  };

  return (
    <div
      className={`p-3.5 rounded-lg border relative overflow-hidden flex flex-col justify-between transition-colors ${
        isLiveOrder
          ? 'bg-red-950/20 border-red-500/40 shadow-inner'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div
        className={`absolute right-0 top-0 w-16 h-16 rounded-full -mr-4 -mt-4 ${
          glowClasses[accentColor] || glowClasses.teal
        }`}
      />
      <div>
        <div className="text-xs text-slate-500 font-medium mb-1">{stepTitle}</div>
        <div className="text-2xl font-bold font-mono text-slate-100 flex items-center gap-2">
          {showSpinner ? (
            <span className={`flex items-center gap-2 ${colorClasses[accentColor] || 'text-teal-400'} text-lg`}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs font-normal">{loadingLabel}</span>
            </span>
          ) : (
            <span className={count > 0 && accentColor !== 'teal' ? (colorClasses[accentColor] || 'text-slate-100') : 'text-slate-100'}>
              {count}
            </span>
          )}
        </div>
        <div className={`text-[10px] mt-1 ${isLiveOrder ? 'font-mono font-medium text-red-400 animate-pulse' : 'text-slate-400'}`}>
          {subtitle}
        </div>
      </div>
      {extraAction && <div className="mt-3">{extraAction}</div>}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'last_run' | 'config' | 'spec'>('last_run');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
  const [dials, setDials] = useState(initialDials);
  const [tempDials, setTempDials] = useState(JSON.parse(JSON.stringify(initialDials)));
  const [filter, setFilter] = useState<string>('ALL');
  const [isRunning, setIsRunning] = useState(false);
  const [placeOrders, setPlaceOrders] = useState<boolean>(false);
  const [ignoreMarketHours, setIgnoreMarketHours] = useState<boolean>(false);
  const [isGeneratingUniverse, setIsGeneratingUniverse] = useState(false);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // Modal state for Propose & Confirm
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [proposedDiff, setProposedDiff] = useState<{ path: string; oldVal: any; newVal: any; desc: string }[]>([]);

  // Universe Modal State
  const [showUniverseModal, setShowUniverseModal] = useState(false);
  const [universeData, setUniverseData] = useState<any[]>([]);
  const [isFetchingUniverse, setIsFetchingUniverse] = useState(false);
  const [universeError, setUniverseError] = useState<string | null>(null);
  const [universeSearch, setUniverseSearch] = useState('');
  const [universeSortField, setUniverseSortField] = useState<string>('ticker');
  const [universeSortAsc, setUniverseSortAsc] = useState<boolean>(true);

  // Simple selector helper for expanded rows in candidate list
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Fetch universe.json content directly
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

  // Filter & sort universe data
  const filteredUniverse = universeData.filter((item: any) => {
    const query = universeSearch.toLowerCase();
    const ticker = typeof item === 'string' ? item.toLowerCase() : (item.ticker || item.symbol || '').toLowerCase();
    const sector = typeof item === 'object' && item.sector ? item.sector.toLowerCase() : '';
    return ticker.includes(query) || sector.includes(query);
  }).sort((a: any, b: any) => {
    let valA = typeof a === 'object' ? a[universeSortField] : a;
    let valB = typeof b === 'object' ? b[universeSortField] : b;
    if (valA == null) valA = '';
    if (valB == null) valB = '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return universeSortAsc ? -1 : 1;
    if (valA > valB) return universeSortAsc ? 1 : -1;
    return 0;
  });

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

  // Fetch the latest telemetry run from backend on page load
  useEffect(() => {
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
        console.error("Failed to generate watchlist:", data.error);
        showToast(`Error: ${data.error || 'Failed to generate watchlist'}`);
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

  // Run Real Python Pipeline via Node.js Server SSE stream
  const triggerDryRun = (runUniverse: boolean = false) => {
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
    
    // Connect to SSE stream
    const eventSource = new EventSource(`/api/run/trigger?runUniverse=${runUniverse}&placeOrders=${placeOrders}&ignoreMarketHours=${ignoreMarketHours}&livePortfolio=true`);
    
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

  // Dial edit handler
  const handleDialChange = (section: keyof typeof dials, field: string, value: number) => {
    setTempDials(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Compare temp values with active ones to create a Propose summary
  const proposeChanges = () => {
    const diffs: typeof proposedDiff = [];
    
    // Check Universe
    Object.keys(dials.universe).forEach(k => {
      const key = k as keyof typeof dials.universe;
      if (dials.universe[key] !== tempDials.universe[key]) {
        diffs.push({
          path: `universe.${key}`,
          oldVal: dials.universe[key],
          newVal: tempDials.universe[key],
          desc: key === 'MIN_PRICE' ? "Adjust threshold for cheap assets" : "Alters universe depth"
        });
      }
    });

    // Check Scanner
    Object.keys(dials.scanner).forEach(k => {
      const key = k as keyof typeof dials.scanner;
      if (dials.scanner[key] !== tempDials.scanner[key]) {
        diffs.push({
          path: `scanner.${key}`,
          oldVal: dials.scanner[key],
          newVal: tempDials.scanner[key],
          desc: "Updates momentum filtering limits"
        });
      }
    });

    // Check Gate 1
    Object.keys(dials.gate1).forEach(k => {
      const key = k as keyof typeof dials.gate1;
      if (dials.gate1[key] !== tempDials.gate1[key]) {
        diffs.push({
          path: `gate1.${key}`,
          oldVal: dials.gate1[key],
          newVal: tempDials.gate1[key],
          desc: "Modifies strict market-level risk circuit breaker"
        });
      }
    });

    // Check Gate 3
    if (dials.gate3.MIN_CONFIDENCE !== tempDials.gate3.MIN_CONFIDENCE) {
      diffs.push({
        path: "gate3.MIN_CONFIDENCE",
        oldVal: dials.gate3.MIN_CONFIDENCE,
        newVal: tempDials.gate3.MIN_CONFIDENCE,
        desc: "Alters required LLM confidence before allowing trade"
      });
    }

    // Check Gate 5
    Object.keys(dials.gate5).forEach(k => {
      const key = k as keyof typeof dials.gate5;
      if (dials.gate5[key] !== tempDials.gate5[key]) {
        diffs.push({
          path: `gate5.${key}`,
          oldVal: dials.gate5[key],
          newVal: tempDials.gate5[key],
          desc: key === 'MIN_EDGE_PCT' ? "Changes strict expected return cutoff rate" : "Adjusts probability baseline"
        });
      }
    });

    // Check Risk
    Object.keys(dials.risk).forEach(k => {
      const key = k as keyof typeof dials.risk;
      if (dials.risk[key] !== tempDials.risk[key]) {
        diffs.push({
          path: `risk.${key}`,
          oldVal: dials.risk[key],
          newVal: tempDials.risk[key],
          desc: "Alters capital exposure and allocation bounds"
        });
      }
    });

    // Check Geometry
    Object.keys(dials.geometry).forEach(k => {
      const key = k as keyof typeof dials.geometry;
      if (dials.geometry[key] !== tempDials.geometry[key]) {
        diffs.push({
          path: `geometry.${key}`,
          oldVal: dials.geometry[key],
          newVal: tempDials.geometry[key],
          desc: "Adjusts structural stop levels and reward multiples"
        });
      }
    });

    if (diffs.length === 0) {
      showToast("No configuration dials have been changed.");
      return;
    }

    setProposedDiff(diffs);
    setShowConfirmModal(true);
  };

  const confirmAndSaveDials = () => {
    setDials(JSON.parse(JSON.stringify(tempDials)));
    setShowConfirmModal(false);
    showToast("Strategy config dials updated successfully on disk (backend/config.py)!");
  };

  const discardDials = () => {
    setTempDials(JSON.parse(JSON.stringify(dials)));
    showToast("Changes discarded. Reverted dials to current live disk state.");
  };

  // Helper filters for candidates table
  const filteredCandidates = telemetry.results.filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'BUY') return item.final_decision === 'BUY';
    if (filter === 'BLOCKED') return item.final_decision.startsWith('BLOCKED') || item.final_decision.startsWith('REJECTED_RISK') || item.final_decision === 'SKIP';
    return true;
  });

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
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-colors ${
                portfolioError 
                  ? 'bg-rose-950/50 border-rose-500/50 text-rose-300' 
                  : 'bg-slate-900 border-slate-800'
              }`}
              title={portfolioError ? `Alpaca Error: ${portfolioError}` : "Toggle portfolio & settings detail"}
            >
              {portfolioError && <XCircle className="h-3 w-3 text-rose-400 shrink-0" />}
              <span className="text-slate-200 font-semibold">${(telemetry.portfolio.value / 1000).toFixed(1)}k</span>
              <span className={`text-[10px] ${telemetry.portfolio.daily_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {telemetry.portfolio.daily_pnl >= 0 ? '+' : ''}{telemetry.portfolio.daily_pnl_pct}%
              </span>
            </button>

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
            {/* Toggles Row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Live Orders Switch */}
              <div className={`p-2 rounded-lg border flex flex-col justify-between gap-1.5 ${
                placeOrders 
                  ? 'bg-red-950/40 border-red-500/50 text-red-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${placeOrders ? 'text-red-400' : 'text-slate-300'}`}>
                    {placeOrders ? 'LIVE TRADES ON' : 'SIMULATION'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={placeOrders}
                    onClick={() => {
                      const nextVal = !placeOrders;
                      setPlaceOrders(nextVal);
                      if (nextVal) {
                        showToast("⚠️ Live Order Execution ENABLED! Real paper orders will be submitted to Alpaca.");
                      } else {
                        showToast("ℹ️ Returned to Simulation / Paper Mode (placeOrders=false).");
                      }
                    }}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      placeOrders ? 'bg-red-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        placeOrders ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">placeOrders={placeOrders ? 'true' : 'false'}</span>
              </div>

              {/* Force Closed Market Orders Switch */}
              <div className={`p-2 rounded-lg border flex flex-col justify-between gap-1.5 ${
                ignoreMarketHours 
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${ignoreMarketHours ? 'text-amber-400' : 'text-slate-300'}`}>
                    {ignoreMarketHours ? 'FORCE CLOSED' : 'CLOCK ENFORCED'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ignoreMarketHours}
                    onClick={() => {
                      const nextVal = !ignoreMarketHours;
                      setIgnoreMarketHours(nextVal);
                      if (nextVal) {
                        showToast("⚠️ Force Closed Market Orders ENABLED! Orders will be placed/queued even when market is closed.");
                      } else {
                        showToast("ℹ️ Market Clock Enforcement ENABLED (Orders blocked outside market hours).");
                      }
                    }}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      ignoreMarketHours ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        ignoreMarketHours ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">ignoreMarketHours={ignoreMarketHours ? 'true' : 'false'}</span>
              </div>
            </div>

            {/* Portfolio Details Card */}
            <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 text-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400 pb-2 border-b border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-slate-200">Portfolio Overview</span>
                    {portfolioLastSync && (
                      <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1 whitespace-nowrap bg-slate-950/70 px-1.5 py-0.5 rounded border border-slate-800">
                        <Clock className="h-2.5 w-2.5 text-teal-400 shrink-0" />
                        <span className="text-slate-500">Updated:</span>
                        <span className="text-slate-300 font-semibold">{portfolioLastSync}</span>
                      </div>
                    )}
                  </div>
                  <button
                    id="btn_sync_alpaca_mobile_mini"
                    onClick={() => fetchLivePortfolio(true)}
                    className="sm:hidden flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 cursor-pointer active:scale-95 transition-all shrink-0"
                    title="Sync Alpaca Portfolio"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${isFetchingPortfolio ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto overflow-hidden">
                  <MarketClockBadge lastSyncTime={portfolioLastSync} />
                  <button
                    id="btn_sync_alpaca_mobile"
                    onClick={() => fetchLivePortfolio(true)}
                    className="hidden sm:flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 cursor-pointer active:scale-95 transition-all shrink-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isFetchingPortfolio ? 'animate-spin' : ''}`} />
                    Sync Alpaca
                  </button>
                </div>
              </div>

              {portfolioError && (
                <div className="p-2 bg-rose-950/80 border border-rose-800/80 rounded text-[11px] text-rose-200 flex items-start gap-1.5 min-w-0">
                  <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 break-words">
                    <span className="font-bold text-rose-300">Alpaca Error: </span>
                    <span className="font-mono text-rose-200 text-[10px] leading-tight">{portfolioError}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 font-sans">Portfolio Value</div>
                  {isFetchingPortfolio ? (
                    <div className="flex items-center gap-1.5 text-teal-400 font-mono text-xs mt-0.5 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      <span className="text-[10px] text-slate-400 font-sans font-medium">Updating...</span>
                    </div>
                  ) : (
                    <div className="text-slate-100 font-bold">${telemetry.portfolio.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-sans">Daily P&L</div>
                  {isFetchingPortfolio ? (
                    <div className="flex items-center gap-1.5 text-teal-400 font-mono text-xs mt-0.5 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      <span className="text-[10px] text-slate-400 font-sans font-medium">Updating...</span>
                    </div>
                  ) : (
                    <div className={`font-bold ${telemetry.portfolio.daily_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {telemetry.portfolio.daily_pnl >= 0 ? '+' : ''}${telemetry.portfolio.daily_pnl.toLocaleString(undefined, {minimumFractionDigits: 2})} ({telemetry.portfolio.daily_pnl_pct}%)
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-sans">Open Positions</div>
                  {isFetchingPortfolio ? (
                    <div className="flex items-center gap-1.5 text-teal-400 font-mono text-xs mt-0.5 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      <span className="text-[10px] text-slate-400 font-sans font-medium">Updating...</span>
                    </div>
                  ) : (
                    <div className="text-slate-200 font-semibold">{telemetry.portfolio.open_positions} / {dials.risk.MAX_OPEN_POSITIONS} max</div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-sans">VIX Level</div>
                  <div className="text-slate-200 font-semibold">{telemetry.portfolio.vix_level} <span className="text-[9px] text-emerald-400 font-sans">(Calm)</span></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-sans">SPY Change</div>
                  <div className="text-emerald-400 font-semibold">+{telemetry.portfolio.spy_change_pct}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-sans">Macro Event</div>
                  <div className="text-slate-300 font-semibold">{telemetry.portfolio.hours_to_next_macro} hrs</div>
                </div>
              </div>
            </div>
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
              
              {/* Live Order Execution Toggle Switch */}
              <div 
                id="live_orders_switch_container"
                className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all ${
                  placeOrders 
                    ? 'bg-red-950/40 border-red-500/50 text-red-300 shadow-md shadow-red-950/50 ring-1 ring-red-500/30' 
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {placeOrders ? (
                    <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
                  ) : (
                    <Activity className="h-4 w-4 text-slate-500" />
                  )}
                  <div className="flex flex-col">
                    <span className={`text-[11px] font-bold leading-tight ${placeOrders ? 'text-red-400' : 'text-slate-300'}`}>
                      {placeOrders ? 'LIVE TRADES ON' : 'SIMULATION MODE'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      placeOrders = {placeOrders ? 'true' : 'false'}
                    </span>
                  </div>
                </div>

                {/* Toggle Switch Button */}
                <button
                  id="toggle_place_orders_switch"
                  type="button"
                  role="switch"
                  aria-checked={placeOrders}
                  onClick={() => {
                    const nextVal = !placeOrders;
                    setPlaceOrders(nextVal);
                    if (nextVal) {
                      showToast("⚠️ Live Order Execution ENABLED! Real paper orders will be submitted to Alpaca.");
                    } else {
                      showToast("ℹ️ Returned to Simulation / Paper Mode (placeOrders=false).");
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    placeOrders ? 'bg-red-500 focus:ring-red-500 ring-offset-slate-950' : 'bg-slate-700 focus:ring-teal-500 ring-offset-slate-950'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      placeOrders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Force Closed Market Orders Toggle Switch */}
              <div 
                id="ignore_market_hours_switch_container"
                className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all ${
                  ignoreMarketHours 
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-md shadow-amber-950/50 ring-1 ring-amber-500/30' 
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${ignoreMarketHours ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                  <div className="flex flex-col">
                    <span className={`text-[11px] font-bold leading-tight ${ignoreMarketHours ? 'text-amber-400' : 'text-slate-300'}`}>
                      {ignoreMarketHours ? 'FORCE CLOSED ORDERS' : 'CLOCK ENFORCED'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      ignoreMarketHours = {ignoreMarketHours ? 'true' : 'false'}
                    </span>
                  </div>
                </div>

                {/* Toggle Switch Button */}
                <button
                  id="toggle_ignore_market_hours_switch"
                  type="button"
                  role="switch"
                  aria-checked={ignoreMarketHours}
                  onClick={() => {
                    const nextVal = !ignoreMarketHours;
                    setIgnoreMarketHours(nextVal);
                    if (nextVal) {
                      showToast("⚠️ Force Closed Market Orders ENABLED! Orders will be placed/queued even when market is closed.");
                    } else {
                      showToast("ℹ️ Market Clock Enforcement ENABLED (Orders blocked outside market hours).");
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    ignoreMarketHours ? 'bg-amber-500 focus:ring-amber-500 ring-offset-slate-950' : 'bg-slate-700 focus:ring-teal-500 ring-offset-slate-950'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      ignoreMarketHours ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

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

          {/* Portfolio Live Indicators Banner (Desktop) */}
          <div className={`border-t px-4 py-2.5 sm:px-6 lg:px-8 text-xs text-slate-300 transition-colors ${
            placeOrders ? 'bg-red-950/20 border-red-900/30' : 'bg-slate-950/60 border-slate-850'
          }`}>
            <div className="max-w-7xl mx-auto flex flex-wrap gap-y-2 items-center justify-between">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Portfolio value:</span>
                  {isFetchingPortfolio ? (
                    <span className="inline-flex items-center gap-1 text-teal-400 font-mono font-semibold animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-[11px] text-slate-400">Updating...</span>
                    </span>
                  ) : (
                    <span className="text-slate-100 font-mono font-semibold">${telemetry.portfolio.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  )}
                  <button
                    id="btn_sync_alpaca_desktop"
                    onClick={() => fetchLivePortfolio(true)}
                    title="Sync live portfolio from Alpaca"
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-teal-400 transition-colors cursor-pointer ml-0.5 active:scale-95"
                  >
                    <RefreshCw className={`h-3 w-3 ${isFetchingPortfolio ? 'animate-spin text-teal-400' : ''}`} />
                  </button>
                  {portfolioLastSync && !isFetchingPortfolio && (
                    <span 
                      id="portfolio_last_sync_badge"
                      className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 ml-1" 
                      title="Alpaca portfolio last synchronized timestamp"
                    >
                      <Clock className="h-2.5 w-2.5 text-teal-400" />
                      <span className="text-slate-500">Updated:</span>
                      <span className="text-slate-300">{portfolioLastSync}</span>
                    </span>
                  )}
                  <MarketClockBadge lastSyncTime={portfolioLastSync} className="ml-2" />
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Daily P&L:</span>
                  {isFetchingPortfolio ? (
                    <span className="inline-flex items-center gap-1 text-teal-400 font-mono font-semibold animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-[11px] text-slate-400">Updating...</span>
                    </span>
                  ) : (
                    <span className={`font-semibold font-mono flex items-center ${telemetry.portfolio.daily_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {telemetry.portfolio.daily_pnl >= 0 ? '+' : ''}${telemetry.portfolio.daily_pnl.toLocaleString(undefined, {minimumFractionDigits: 2})} 
                      <span className="text-[10px] ml-1">({telemetry.portfolio.daily_pnl_pct}%)</span>
                      {telemetry.portfolio.daily_pnl >= 0 ? <ArrowUpRight className="h-3 w-3 ml-0.5" /> : <ArrowDownRight className="h-3 w-3 ml-0.5" />}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Positions:</span>
                  {isFetchingPortfolio ? (
                    <span className="inline-flex items-center gap-1 text-teal-400 font-mono font-semibold animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-[11px] text-slate-400">Updating...</span>
                    </span>
                  ) : (
                    <span className="text-slate-100 font-semibold">{telemetry.portfolio.open_positions} <span className="text-slate-500">/ {dials.risk.MAX_OPEN_POSITIONS} max</span></span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
                  <span className="text-slate-500 font-medium">VIX:</span>
                  <span className="text-slate-100 font-semibold">{telemetry.portfolio.vix_level}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/10">Calm</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">SPY Change:</span>
                  <span className="text-emerald-400 font-semibold font-mono">+{telemetry.portfolio.spy_change_pct}%</span>
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                {placeOrders && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="h-3 w-3" /> LIVE TRADES ACTIVE
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                    telemetry.portfolio.hours_to_next_macro !== null && telemetry.portfolio.hours_to_next_macro <= 2.0 
                      ? 'bg-amber-400 animate-ping' 
                      : 'bg-emerald-500'
                  }`}></span>
                  <span className="text-slate-500">Macro Event:</span>
                  <span className="text-slate-300 font-medium">
                    {telemetry.portfolio.hours_to_next_macro !== null && telemetry.portfolio.hours_to_next_macro !== undefined
                      ? `${telemetry.portfolio.hours_to_next_macro} hrs`
                      : 'None (>24h)'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Connection Error Banner (Yells when API fails) */}
        {portfolioError && (
          <div className="bg-rose-950/95 border-t border-b border-rose-800 text-rose-200 px-3 py-2.5 sm:px-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg w-full">
            <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
              <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 min-w-0 flex-1">
                <span className="font-bold text-rose-300 uppercase tracking-wide shrink-0 text-[11px] sm:text-xs">Alpaca API Error:</span>
                <span className="font-mono text-rose-100 text-[11px] break-words leading-snug">{portfolioError}</span>
              </div>
            </div>
            <button 
              onClick={fetchLivePortfolio}
              className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-rose-100 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-rose-700 transition-all cursor-pointer shrink-0 w-full sm:w-auto mt-1 sm:mt-0"
            >
              <RefreshCw className={`h-3 w-3 ${isFetchingPortfolio ? 'animate-spin' : ''}`} />
              Retry Connection
            </button>
          </div>
        )}

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
            <section id="results_table_section" className="bg-slate-950 rounded-xl border border-slate-800 shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">Nightly Candiate Process List</h2>
                  <p className="text-xs text-slate-400 mt-1">Processed ticker decisions output matching notebook <code className="bg-slate-900 px-1 rounded font-mono text-[10px]">_row()</code> schema.</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Filter Decision:</span>
                  <div className="bg-slate-900 p-0.5 rounded-lg border border-slate-800 flex">
                    <button 
                      onClick={() => setFilter('ALL')}
                      className={`px-2.5 py-1 text-[10px] rounded font-medium ${filter === 'ALL' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      All ({telemetry.results.length})
                    </button>
                    <button 
                      onClick={() => setFilter('BUY')}
                      className={`px-2.5 py-1 text-[10px] rounded font-medium ${filter === 'BUY' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      BUYs ({telemetry.results.filter(x=>x.final_decision === 'BUY').length})
                    </button>
                    <button 
                      onClick={() => setFilter('BLOCKED')}
                      className={`px-2.5 py-1 text-[10px] rounded font-medium ${filter === 'BLOCKED' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Blocked / Skips ({telemetry.results.filter(x=>x.final_decision !== 'BUY').length})
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
                    {filteredCandidates.map((row, idx) => {
                      const isPlaced = row.final_decision === 'PLACED' || row.final_decision === 'PLACED_UNPROTECTED';
                      const isQueued = row.final_decision === 'QUEUED_MARKET_CLOSED';
                      const isExecFailed = row.final_decision === 'EXEC_FAILED' || row.final_decision.startsWith('EXEC_FAILED');
                      const isBuy = row.final_decision === 'BUY';
                      const isBlocked = row.final_decision.startsWith('BLOCKED') || row.final_decision.startsWith('REJECTED_RISK');
                      const isSkip = row.final_decision === 'SKIP';

                      return (
                        <React.Fragment key={idx}>
                          <tr className={`hover:bg-slate-900/30 transition-colors cursor-pointer ${expandedRow === row.ticker ? 'bg-slate-900/40' : ''}`} onClick={() => setExpandedRow(expandedRow === row.ticker ? null : row.ticker)}>
                            
                            {/* TICKER */}
                            <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2">
                              {row.ticker}
                              {(isBuy || isPlaced || isQueued) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>}
                              {isExecFailed && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>}
                              {isBlocked && <span className="w-1.5 h-1.5 rounded-full bg-rose-500/60 inline-block"></span>}
                            </td>

                            {/* FINAL DECISION BADGE */}
                            <td className="py-3.5 px-4">
                              {isPlaced && (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center w-fit gap-1 shadow-sm">
                                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                                  ORDER FILLED / PLACED
                                </span>
                              )}
                              {isQueued && (
                                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center w-fit gap-1">
                                  <Clock className="h-3 w-3 text-blue-400" />
                                  QUEUED FOR OPEN
                                </span>
                              )}
                              {isExecFailed && (
                                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded text-[10px] font-bold flex items-center w-fit gap-1 shadow-sm">
                                  <XCircle className="h-3 w-3 text-rose-400" />
                                  EXECUTION FAILED
                                </span>
                              )}
                              {isBuy && !isPlaced && !isQueued && !isExecFailed && (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center w-fit gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  BUY / Approved
                                </span>
                              )}
                              {isBlocked && (
                                <span className="bg-rose-950/60 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center w-fit gap-1 shadow-sm font-mono">
                                  <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                                  {row.final_decision.replace('REJECTED_RISK:open_positions', 'BLOCKED_RISK:max_positions')}
                                </span>
                              )}
                              {isSkip && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center w-fit gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  SKIP (Low EV)
                                </span>
                              )}
                              {!isBuy && !isPlaced && !isQueued && !isExecFailed && !isBlocked && !isSkip && (
                                <span className="bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center w-fit gap-1 animate-pulse">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  {row.final_decision || 'EVALUATING...'}
                                </span>
                              )}
                            </td>

                            {/* G3 SENTIMENT */}
                            <td className="py-3.5 px-4 text-slate-300">
                              {row.g3_direction ? (
                                <span className="flex items-center gap-1.5">
                                  <span className={`font-medium ${row.g3_direction === 'BULLISH' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {row.g3_direction}
                                  </span>
                                  <span className="text-slate-500 text-[10px]">({row.g3_confidence}/10)</span>
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            {/* EXPECTED VALUE */}
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-200">
                              {row.ev !== null ? `+${(row.ev * 100).toFixed(1)}%` : <span className="text-slate-600">—</span>}
                            </td>

                            {/* WIN PROB */}
                            <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                              {row.win_prob !== null ? `${(row.win_prob * 100).toFixed(0)}%` : <span className="text-slate-600">—</span>}
                            </td>

                            {/* GEOMETRY (ENTRY/STOP/TARGET) */}
                            <td className="py-3.5 px-4 font-mono text-slate-400">
                              {row.trade_levels ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-100 font-semibold">${row.trade_levels.entry}</span>
                                  <span className="text-slate-600">/</span>
                                  <span className="text-rose-400">${row.trade_levels.stop}</span>
                                  <span className="text-slate-600">/</span>
                                  <span className="text-emerald-400">${row.trade_levels.target}</span>
                                  <span className="text-[10px] text-slate-500 ml-1">({row.trade_levels.reward_risk}R)</span>
                                </div>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            {/* RISK SIZING */}
                            <td className="py-3.5 px-4 text-right">
                              {row.risk_sizing ? (
                                <div>
                                  <div className="font-semibold text-slate-100">{row.risk_sizing.shares} sh</div>
                                  <div className="text-[10px] text-slate-400 font-mono">${row.risk_sizing.position_value} ({row.risk_sizing.position_pct}%)</div>
                                </div>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            {/* EXPAND ACTION */}
                            <td className="py-3.5 px-4 text-center">
                              <button className="text-slate-500 hover:text-slate-300 p-1">
                                <ChevronRight className={`h-4 w-4 transform transition-transform ${expandedRow === row.ticker ? 'rotate-90 text-teal-400' : ''}`} />
                              </button>
                            </td>

                          </tr>

                          {/* EXPANDED SUB-ROW DETAILS */}
                          {expandedRow === row.ticker && (
                            <tr className="bg-slate-900/50">
                              <td colSpan={8} className="py-3 px-6 border-b border-slate-850">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                    <Info className="h-3.5 w-3.5 text-teal-400" />
                                    Pipeline Decision Audit Log
                                  </div>
                                  <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                                    {row.notes}
                                  </p>
                                  {(row.exec_error || row.final_decision.startsWith('EXEC_FAILED')) && (
                                    <div className="bg-rose-950/80 border border-rose-800 rounded p-3 text-rose-200 text-xs w-full flex items-start gap-2.5 my-1.5 shadow-md">
                                      <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                                      <div>
                                        <div className="font-bold text-rose-300 uppercase tracking-wide">Alpaca Execution Failure Details</div>
                                        <div className="font-mono mt-1 text-rose-100">{row.exec_error || row.notes || 'Order rejected by broker'}</div>
                                      </div>
                                    </div>
                                  )}
                                  {row.risk_reject_reason && (
                                    <div className="bg-rose-500/10 border border-rose-500/20 rounded p-2.5 text-rose-300 text-xs w-fit flex items-center gap-2">
                                      <XCircle className="h-4 w-4 text-rose-400" />
                                      <strong>Blocking Reason:</strong> {row.risk_reject_reason}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SEGMENT D: APPROVED SIGNALS SUMMARY */}
            <section id="approved_signals_summary" className="bg-slate-950 rounded-xl p-5 border border-slate-800 shadow-md">
              <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase flex items-center gap-2 mb-4">
                <CheckCircle className="h-4 w-4 text-teal-400" />
                Approved Buy Signals Checklist
              </h2>
              
              {(() => {
                const approvedList = telemetry.results.filter(x => 
                  x.final_decision === 'BUY' || 
                  x.final_decision?.startsWith('PLACED') || 
                  x.final_decision === 'QUEUED_MARKET_CLOSED' ||
                  (x.risk_sizing && !x.final_decision?.startsWith('BLOCKED') && !x.final_decision?.startsWith('REJECTED_RISK') && x.final_decision !== 'SKIP')
                );

                if (approvedList.length === 0) {
                  return (
                    <div className="p-6 text-center rounded-lg border border-dashed border-slate-800 text-slate-500 text-xs">
                      No approved buy signals generated in the current execution run.
                    </div>
                  );
                }

                return (
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
                                1.5x ATR ({dials.geometry.atr_stop_multiplier} multiplier)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>

          </div>
        )}

        {/* TAB 2: CONFIGURATION DIALS */}
        {activeTab === 'config' && (
          <div id="dials_view" className="space-y-6">
            
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Interactive Strategy Dials Configuration</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust parameter bounds below. Changes are saved with a strict <strong>Propose-and-Confirm</strong> old-to-new visual diff step before writing to <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400 text-[10px]">backend/config.py</code>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  id="btn_discard_config"
                  onClick={discardDials}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Discard Changes
                </button>
                <button 
                  id="btn_propose_config"
                  onClick={proposeChanges}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Propose Changes
                </button>
              </div>
            </div>

            {/* EDIT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* CARD 1: UNIVERSE FILTERS */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
                  <Database className="h-4 w-4 text-teal-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">1. Universe filter constraints</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>MIN_PRICE ($)</span>
                      <span className="text-[10px] text-slate-500">Only trade liquid stocks</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={tempDials.universe.MIN_PRICE}
                      onChange={(e) => handleDialChange('universe', 'MIN_PRICE', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>MIN_MARKET_CAP (Billions $)</span>
                      <span className="text-[10px] text-slate-500">Large & Mega caps only</span>
                    </label>
                    <input 
                      type="number" 
                      step="10"
                      value={tempDials.universe.MIN_MARKET_CAP_BILLIONS}
                      onChange={(e) => handleDialChange('universe', 'MIN_MARKET_CAP_BILLIONS', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>MIN ATR (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={tempDials.universe.MIN_ATR_PCT}
                        onChange={(e) => handleDialChange('universe', 'MIN_ATR_PCT', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>MAX ATR (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={tempDials.universe.MAX_ATR_PCT}
                        onChange={(e) => handleDialChange('universe', 'MAX_ATR_PCT', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>EARNINGS_WINDOW_DAYS</span>
                      <span className="text-[10px] text-slate-500">Earnings avoid safety bounds</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={tempDials.universe.EARNINGS_WINDOW_DAYS}
                      onChange={(e) => handleDialChange('universe', 'EARNINGS_WINDOW_DAYS', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: MOMENTUM SCANNER */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
                  <TrendingUp className="h-4 w-4 text-teal-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">2. Momentum scanner thresholds</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>TOP_N Candidates limit</span>
                      <span className="text-[10px] text-slate-500">Limits Claude API token usage</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={tempDials.scanner.TOP_N}
                      onChange={(e) => handleDialChange('scanner', 'TOP_N', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>MIN_SCORE (0 - 3)</span>
                      <span className="text-[10px] text-slate-500">Minimum momentum requirements</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      min="0"
                      max="3"
                      value={tempDials.scanner.MIN_SCORE}
                      onChange={(e) => handleDialChange('scanner', 'MIN_SCORE', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>RSI_MIN</span>
                      </label>
                      <input 
                        type="number" 
                        step="1"
                        value={tempDials.scanner.RSI_MIN}
                        onChange={(e) => handleDialChange('scanner', 'RSI_MIN', parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>RSI_MAX</span>
                      </label>
                      <input 
                        type="number" 
                        step="1"
                        value={tempDials.scanner.RSI_MAX}
                        onChange={(e) => handleDialChange('scanner', 'RSI_MAX', parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: GATE 1 HARD THREATS */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">3. Gate 1 Hard stress boundaries</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>VIX Index limit</span>
                      <span className="text-[10px] text-slate-500">Block trades if market VIX exceeds</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={tempDials.gate1.vix_level_limit}
                      onChange={(e) => handleDialChange('gate1', 'vix_level_limit', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>SPY Daily Min (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={tempDials.gate1.spy_change_pct_limit}
                        onChange={(e) => handleDialChange('gate1', 'spy_change_pct_limit', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>Sector Daily Min (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={tempDials.gate1.sector_change_pct_limit}
                        onChange={(e) => handleDialChange('gate1', 'sector_change_pct_limit', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>Premarket Gap Limit (%)</span>
                      <span className="text-[10px] text-slate-500">Avoid earnings gaps</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={tempDials.gate1.premarket_gap_pct_limit}
                      onChange={(e) => handleDialChange('gate1', 'premarket_gap_pct_limit', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>
                </div>
              </div>

              {/* CARD 4: INTELLIGENCE AGENTS (GATE 3 & 5) */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
                  <Sparkles className="h-4 w-4 text-teal-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">4. LLM Gate & Edge thresholds</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>Gate 3 Min AI Confidence</span>
                      <span className="text-[10px] text-slate-500">Reject Claude direction if score under</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      min="1"
                      max="10"
                      value={tempDials.gate3.MIN_CONFIDENCE}
                      onChange={(e) => handleDialChange('gate3', 'MIN_CONFIDENCE', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>WIN_PROB_BASE (%)</span>
                      <span className="text-[10px] text-slate-500">Starting baseline win expectation</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={tempDials.gate5.WIN_PROB_BASE}
                      onChange={(e) => handleDialChange('gate5', 'WIN_PROB_BASE', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>MIN_EDGE_PCT (%)</span>
                      <span className="text-[10px] text-teal-400">Strict EV survival threshold</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={tempDials.gate5.MIN_EDGE_PCT}
                      onChange={(e) => handleDialChange('gate5', 'MIN_EDGE_PCT', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-teal-400 focus:outline-none focus:border-teal-500 border-teal-500/30" 
                    />
                  </div>
                </div>
              </div>

              {/* CARD 5: RISK CONTROLS */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
                  <Sliders className="h-4 w-4 text-teal-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">5. Sizing & Risk Controls</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>MAX_OPEN_POSITIONS</span>
                      <span className="text-[10px] text-slate-500">Maximum concurrent open trades</span>
                    </label>
                    <input 
                      type="number" 
                      step="1"
                      value={tempDials.risk.MAX_OPEN_POSITIONS}
                      onChange={(e) => handleDialChange('risk', 'MAX_OPEN_POSITIONS', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>Max Daily Loss (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.5"
                        value={tempDials.risk.MAX_DAILY_LOSS_PCT}
                        onChange={(e) => handleDialChange('risk', 'MAX_DAILY_LOSS_PCT', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1">
                        <span>Max Drawdown (%)</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.5"
                        value={tempDials.risk.MAX_DRAWDOWN_PCT}
                        onChange={(e) => handleDialChange('risk', 'MAX_DRAWDOWN_PCT', parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>Kelly Fraction allocation multiplier</span>
                      <span className="text-[10px] text-slate-500">Fractional Kelly sizing buffer</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={tempDials.risk.KELLY_FRACTION}
                      onChange={(e) => handleDialChange('risk', 'KELLY_FRACTION', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>
                </div>
              </div>

              {/* CARD 6: GEOMETRY LEVELS */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
                  <DollarSign className="h-4 w-4 text-teal-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">6. Trade Geometry Limits</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>ATR stop multiplier</span>
                      <span className="text-[10px] text-slate-500">Distance from entry to trailing stop</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={tempDials.geometry.atr_stop_multiplier}
                      onChange={(e) => handleDialChange('geometry', 'atr_stop_multiplier', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
                      <span>Target RR multiple</span>
                      <span className="text-[10px] text-slate-500">Target reward ratio (R:R ratio multiplier)</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={tempDials.geometry.target_rr_multiple}
                      onChange={(e) => handleDialChange('geometry', 'target_rr_multiple', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: DESIGN SPECIFICATION VIEWER */}
        {activeTab === 'spec' && (
          <div id="spec_view" className="bg-slate-950 rounded-xl border border-slate-800 shadow-md p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Design Specification Doc</h2>
                <p className="text-xs text-slate-400 mt-1">Written specification generated in <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400">/spec/design-v0-dashboard.md</code></p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">
                <Database className="h-4 w-4 text-teal-400" />
                <span>REST API Configured</span>
              </div>
            </div>

            <article className="prose prose-invert prose-sm text-slate-300 max-w-none space-y-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="bg-teal-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded">v0</span>
                Scope Constraints Adhered To:
              </h3>
              <p className="text-xs text-slate-400">
                We stay strictly at v0 (simplest browser cockpit), grounded directly in the python config and notebook output models. Any secondary features (closing positions from UI, interactive streaming charts, live logs socket stream) are deferred.
              </p>

              <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 text-xs space-y-2">
                <h4 className="font-bold text-slate-200">🗄️ Backend REST Contract Endpoints (FastAPI façade adapters)</h4>
                <div className="space-y-2 font-mono text-[11px] text-slate-300">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="text-emerald-400">GET /run/latest</span>
                    <span className="text-slate-500">Latest pipeline funnel states & results rows</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="text-teal-400">POST /run</span>
                    <span className="text-slate-500">Dry-run pipeline execution</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="text-emerald-400">GET /config</span>
                    <span className="text-slate-500">Retrieve config strategy dials payload</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400">PATCH /config</span>
                    <span className="text-slate-500">Save modified dials with validation diff safety</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-850 pt-4">
                <h4 className="font-bold text-slate-200 mb-2">📋 Deferred backlogs (Deferred to Phase 8+)</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                  <li>Closing existing positions manually from client interface</li>
                  <li>In-app live interactive D3.js or Recharts stock price plots</li>
                  <li>Live scheduler pause/resume cron service controller</li>
                  <li>Multi-user credentials and custom JWT Auth integration</li>
                </ul>
              </div>

            </article>
          </div>
        )}

      </main>

      {/* CONFIRM PROPOSE MODAL OVERLAY */}
      {showConfirmModal && (
        <div id="confirm_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-xl border border-slate-800 max-w-lg w-full overflow-hidden shadow-2xl">
            
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-teal-400" />
                Confirm Propose Config Dials Change
              </h3>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-400">
                You are about to propose modifications to <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400 font-mono">backend/config.py</code>. Please confirm the visual old-to-new differences:
              </p>

              {/* Diffs List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {proposedDiff.map((diff, i) => (
                  <div key={i} className="bg-slate-950 p-3 rounded border border-slate-850 text-xs space-y-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-teal-400 font-semibold">{diff.path}</span>
                      <span className="text-slate-500 font-medium">{diff.desc}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/15 px-2 py-0.5 rounded font-mono text-[10px]">{diff.oldVal}</span>
                      <ArrowRight className="h-3 w-3 text-slate-600" />
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded font-mono text-[10px]">{diff.newVal}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-teal-500/5 p-3 rounded-lg border border-teal-500/10 text-xs text-slate-400">
                🛡️ <strong>Safety check:</strong> Validation tests passed successfully. The new dials are within safe functional constraints. Saving will record a history log.
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-semibold rounded border border-slate-800 cursor-pointer text-slate-300"
              >
                Cancel Propose
              </button>
              <button 
                id="btn_confirm_save_config"
                onClick={confirmAndSaveDials}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded cursor-pointer shadow-md"
              >
                Confirm & Save Dials
              </button>
            </div>

          </div>
        </div>
      )}

      {/* UNIVERSE WATCHLIST MODAL OVERLAY */}
      {showUniverseModal && (
        <div id="universe_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 rounded-xl border border-slate-800 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-teal-500/10 p-2 rounded-lg border border-teal-500/20">
                  <Database className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100">Universe Watchlist Candidates</h3>
                    <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                      universe.json
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Full stock universe generated by Stage 1 Nightly Scanner
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={openUniverseModal}
                  disabled={isFetchingUniverse}
                  title="Reload universe.json from backend"
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetchingUniverse ? 'animate-spin text-teal-400' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button 
                  onClick={() => setShowUniverseModal(false)}
                  className="text-slate-400 hover:text-slate-100 p-1.5 rounded hover:bg-slate-800 text-sm font-bold transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-grow overflow-y-auto space-y-4">
              
              {/* Controls & Search bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input 
                    type="text"
                    placeholder="Search ticker or sector..."
                    value={universeSearch}
                    onChange={(e) => setUniverseSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                
                <div className="flex items-center gap-3 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-[11px]">
                    Showing <strong className="text-teal-400 font-mono">{filteredUniverse.length}</strong> of <strong className="text-slate-200 font-mono">{universeData.length}</strong> candidates
                  </span>
                  <button
                    onClick={handleLoadWatchlist}
                    disabled={isGeneratingUniverse}
                    className="px-3 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isGeneratingUniverse ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    <span>Re-run Scanner</span>
                  </button>
                </div>
              </div>

              {/* Status or Errors */}
              {isFetchingUniverse ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-400 mx-auto" />
                  <p className="text-xs text-slate-400">Loading universe.json from backend...</p>
                </div>
              ) : universeError ? (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg text-xs text-rose-300 space-y-2">
                  <div className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>Failed to load universe.json</span>
                  </div>
                  <p>{universeError}</p>
                  <button
                    onClick={handleLoadWatchlist}
                    className="mt-2 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    Generate Watchlist Now
                  </button>
                </div>
              ) : universeData.length === 0 ? (
                <div className="py-12 text-center space-y-3 bg-slate-950/50 rounded-lg border border-dashed border-slate-800">
                  <Database className="h-10 w-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No tickers found in universe.json.</p>
                  <button
                    onClick={handleLoadWatchlist}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
                  >
                    Generate Watchlist
                  </button>
                </div>
              ) : (
                /* Table View */
                <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950 max-h-[50vh]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium sticky top-0 z-10">
                      <tr>
                        <th 
                          className="px-4 py-2.5 cursor-pointer hover:text-teal-400 transition-colors"
                          onClick={() => {
                            if (universeSortField === 'ticker') setUniverseSortAsc(!universeSortAsc);
                            else { setUniverseSortField('ticker'); setUniverseSortAsc(true); }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span>Ticker</span>
                            <ArrowUpDown className="h-3 w-3 opacity-60" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-2.5 cursor-pointer hover:text-teal-400 transition-colors"
                          onClick={() => {
                            if (universeSortField === 'sector') setUniverseSortAsc(!universeSortAsc);
                            else { setUniverseSortField('sector'); setUniverseSortAsc(true); }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span>Sector</span>
                            <ArrowUpDown className="h-3 w-3 opacity-60" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-2.5 cursor-pointer hover:text-teal-400 transition-colors text-right"
                          onClick={() => {
                            if (universeSortField === 'price') setUniverseSortAsc(!universeSortAsc);
                            else { setUniverseSortField('price'); setUniverseSortAsc(false); }
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Price</span>
                            <ArrowUpDown className="h-3 w-3 opacity-60" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-2.5 cursor-pointer hover:text-teal-400 transition-colors text-right"
                          onClick={() => {
                            if (universeSortField === 'volume') setUniverseSortAsc(!universeSortAsc);
                            else { setUniverseSortField('volume'); setUniverseSortAsc(false); }
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Volume</span>
                            <ArrowUpDown className="h-3 w-3 opacity-60" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-2.5 cursor-pointer hover:text-teal-400 transition-colors text-right"
                          onClick={() => {
                            if (universeSortField === 'atr_pct') setUniverseSortAsc(!universeSortAsc);
                            else { setUniverseSortField('atr_pct'); setUniverseSortAsc(false); }
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>ATR %</span>
                            <ArrowUpDown className="h-3 w-3 opacity-60" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-2.5 cursor-pointer hover:text-teal-400 transition-colors text-right"
                          onClick={() => {
                            if (universeSortField === 'rsi') setUniverseSortAsc(!universeSortAsc);
                            else { setUniverseSortField('rsi'); setUniverseSortAsc(false); }
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>RSI</span>
                            <ArrowUpDown className="h-3 w-3 opacity-60" />
                          </div>
                        </th>
                        <th className="px-4 py-2.5 text-right">SMA 20 / 50</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 font-mono text-[11px] text-slate-300">
                      {filteredUniverse.map((item: any, idx: number) => {
                        const ticker = typeof item === 'string' ? item : (item.ticker || item.symbol || 'N/A');
                        const isStringOnly = typeof item === 'string';
                        return (
                          <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                            <td className="px-4 py-2 font-bold text-teal-300">
                              {ticker}
                            </td>
                            <td className="px-4 py-2 text-slate-400 font-sans text-xs">
                              {!isStringOnly && item.sector ? item.sector : 'N/A'}
                            </td>
                            <td className="px-4 py-2 text-right text-slate-100">
                              {!isStringOnly && item.price != null ? `$${Number(item.price).toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-2 text-right text-slate-400">
                              {!isStringOnly && item.volume != null ? Number(item.volume).toLocaleString() : '-'}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {!isStringOnly && item.atr_pct != null ? (
                                <span className="bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/15">
                                  {Number(item.atr_pct).toFixed(2)}%
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-2 text-right text-slate-300">
                              {!isStringOnly && item.rsi != null ? Number(item.rsi).toFixed(1) : '-'}
                            </td>
                            <td className="px-4 py-2 text-right text-slate-400">
                              {!isStringOnly && item.sma20 != null && item.sma50 != null ? (
                                <span>${Number(item.sma20).toFixed(1)} / ${Number(item.sma50).toFixed(1)}</span>
                              ) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px] text-slate-500">
                Data source: <code className="text-amber-400 font-mono">backend/01_scanner/data/universe.json</code>
              </span>
              <button 
                onClick={() => setShowUniverseModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-850 py-4 mt-auto text-center text-xs text-slate-500">
        <p>© 2026 Trading Bot Cockpit • Design Specification Playground Cockpit v0</p>
      </footer>

    </div>
  );
}

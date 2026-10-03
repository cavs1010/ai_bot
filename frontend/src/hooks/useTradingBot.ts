import { useState, useEffect, useMemo } from 'react';
import { 
  TelemetryData, 
  StrategyDials, 
  DialDiffItem, 
  UniverseItem 
} from '../types';
import { initialTelemetry, initialDials } from '../fixtures';
import { VariableInfo } from '../utils/variableDescriptions';

export function useTradingBot() {
  const [activeTab, setActiveTab] = useState<'last_run' | 'config' | 'spec'>('last_run');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData>(initialTelemetry);
  const [dials, setDials] = useState<StrategyDials>(initialDials);
  const [tempDials, setTempDials] = useState<StrategyDials>(JSON.parse(JSON.stringify(initialDials)));
  const [filter, setFilter] = useState<string>('ALL');
  const [isRunning, setIsRunning] = useState(false);
  const [placeOrders, setPlaceOrders] = useState<boolean>(false);
  const [ignoreMarketHours, setIgnoreMarketHours] = useState<boolean>(false);
  const [isGeneratingUniverse, setIsGeneratingUniverse] = useState(false);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // Modal state for Propose & Confirm
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [proposedDiff, setProposedDiff] = useState<DialDiffItem[]>([]);

  // Strategy Config Profile state
  const [strategyName, setStrategyName] = useState<string>('Default Momentum Strategy');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Variable Info Modal State (Mobile Bottom Sheet)
  const [selectedVariableInfo, setSelectedVariableInfo] = useState<VariableInfo | null>(null);

  // Universe Modal State
  const [showUniverseModal, setShowUniverseModal] = useState(false);
  const [universeData, setUniverseData] = useState<UniverseItem[]>([]);
  const [isFetchingUniverse, setIsFetchingUniverse] = useState(false);
  const [universeError, setUniverseError] = useState<string | null>(null);
  const [universeSearch, setUniverseSearch] = useState('');
  const [universeSortField, setUniverseSortField] = useState<string>('ticker');
  const [universeSortAsc, setUniverseSortAsc] = useState<boolean>(true);

  // Candidate row expansion state
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Fetch live portfolio directly from Alpaca API (GET) and optionally persist snapshot via POST
  const fetchLivePortfolio = async (showNotification: boolean = false, saveSnapshot: boolean = false) => {
    setIsFetchingPortfolio(true);
    setPortfolioError(null);
    try {
      if (saveSnapshot) {
        // Explicit POST to create snapshot in Neon DB
        await fetch('/api/portfolio/snapshots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger_source: 'MANUAL_UPDATE' }),
        }).catch(err => console.warn('Failed to persist snapshot:', err));
      }

      const res = await fetch('/api/portfolio/live');
      const data = await res.json();
      if (res.ok && data.success) {
        const syncTime = formatTimestamp();
        setPortfolioLastSync(syncTime);
        setTelemetry(prev => ({
          ...prev,
          portfolio: {
            ...prev.portfolio,
            value: typeof data.value === 'number' ? Number(data.value.toFixed(2)) : data.value,
            daily_pnl: typeof data.daily_pnl === 'number' ? Number(data.daily_pnl.toFixed(2)) : data.daily_pnl,
            daily_pnl_pct: typeof data.daily_pnl_pct === 'number' ? Number(data.daily_pnl_pct.toFixed(2)) : data.daily_pnl_pct,
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
  const filteredUniverse = useMemo(() => {
    return universeData.filter((item: any) => {
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
  }, [universeData, universeSearch, universeSortField, universeSortAsc]);

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
      const res = await fetch('/api/universe/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned invalid response (HTTP ${res.status})`);
      }
      if (res.ok && data.success) {
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
        console.error("Failed to generate watchlist:", data?.error || data?.details);
        showToast(`Error: ${data?.error || data?.details || 'Failed to generate watchlist'}`);
      }
    } catch (err: any) {
      console.error("Error calling /api/universe/generate:", err);
      showToast(`Error generating watchlist: ${err.message}`);
    } finally {
      setIsGeneratingUniverse(false);
    }
  };

  // Structured SSE Candidate Event Handler
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

      const mG1Pass = logLine.match(/\[gate1\] ([A-Z0-9]+): passed all 8 checks/);
      if (mG1Pass) {
        const ticker = mG1Pass[1];
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1 && results[idx].final_decision === 'EVALUATING...') {
          results[idx] = { ...results[idx], final_decision: 'PASSED_G1', notes: 'Gate 1 passed' };
          updated = true;
        }
      }

      const mG2Block = logLine.match(/\[gate2\] ([A-Z0-9]+): BLOCKED — (.*)/);
      if (mG2Block) {
        const [, ticker, reason] = mG2Block;
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = { ...results[idx], final_decision: 'BLOCKED_G2', notes: `Gate 2: ${reason}` };
          updated = true;
        }
      }

      const mG2Pass = logLine.match(/\[gate2\] ([A-Z0-9]+): Passed news safety checks/);
      if (mG2Pass) {
        const ticker = mG2Pass[1];
        const idx = results.findIndex(r => r.ticker === ticker);
        if (idx !== -1) {
          results[idx] = { ...results[idx], final_decision: 'PASSED_G2', notes: 'Gate 2 passed' };
          updated = true;
        }
      }

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

  // Run Real Python Pipeline via Node.js Server Job Lifecycle (POST create -> GET stream)
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

    try {
      const res = await fetch('/api/pipeline/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_universe: runUniverse,
          place_orders: placeOrders,
          ignore_market_hours: ignoreMarketHours,
          live_portfolio: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}: Failed to start pipeline run`);
      }

      const runSession = await res.json();
      const streamUrl = runSession.stream_url || `/api/pipeline/runs/${runSession.run_id}/stream`;

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
            fetchLivePortfolio(false);
          } else if (data.error) {
            setPipelineRunError(data.error);
            setPipelineErrorExpanded(true);
            showToast(`Pipeline Error: ${data.error.slice(0, 80)}...`);
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
          console.error("Error parsing SSE message:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn("SSE connection closed or error encountered:", err);
        eventSource.close();
        setIsRunning(false);
        fetchLivePortfolio(false);
      };
    } catch (err: any) {
      console.error("Error initiating pipeline run:", err);
      setPipelineRunError(err.message || 'Failed to trigger pipeline');
      setPipelineErrorExpanded(true);
      setIsRunning(false);
    }
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

  // Dial edit handler
  const handleDialChange = (section: keyof StrategyDials, field: string, value: number) => {
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
    const diffs: DialDiffItem[] = [];
    
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

  // POST /api/configs - Save strategy configuration dials profile to Neon Database
  const handleSaveConfig = async () => {
    if (!strategyName.trim()) {
      showToast("Please enter a strategy configuration name.");
      return;
    }

    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: strategyName.trim(),
          is_default: true,
          parameters_json: tempDials,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDials(JSON.parse(JSON.stringify(tempDials)));
        showToast(`Strategy '${data.data?.name || strategyName}' (v${data.data?.version || 1}) saved to database!`);
      } else {
        showToast(`Failed to save config: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error("Error saving strategy config:", err);
      showToast(`Error saving config: ${err.message || 'Network error'}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const discardDials = () => {
    setTempDials(JSON.parse(JSON.stringify(dials)));
    showToast("Changes discarded. Reverted dials to current live disk state.");
  };

  return {
    activeTab,
    setActiveTab,
    mobileMenuOpen,
    setMobileMenuOpen,
    telemetry,
    dials,
    tempDials,
    filter,
    setFilter,
    isRunning,
    placeOrders,
    setPlaceOrders,
    ignoreMarketHours,
    setIgnoreMarketHours,
    isGeneratingUniverse,
    runLog,
    successToast,
    showToast,
    showConfirmModal,
    setShowConfirmModal,
    proposedDiff,
    strategyName,
    setStrategyName,
    isSavingConfig,
    selectedVariableInfo,
    setSelectedVariableInfo,
    showUniverseModal,
    setShowUniverseModal,
    universeData,
    isFetchingUniverse,
    universeError,
    universeSearch,
    setUniverseSearch,
    universeSortField,
    setUniverseSortField,
    universeSortAsc,
    setUniverseSortAsc,
    filteredUniverse,
    expandedRow,
    setExpandedRow,
    portfolioError,
    pipelineRunError,
    setPipelineRunError,
    pipelineErrorExpanded,
    setPipelineErrorExpanded,
    copiedError,
    setCopiedError,
    isFetchingPortfolio,
    portfolioLastSync,
    formatToLocalDisplay,
    fetchLivePortfolio,
    openUniverseModal,
    handleLoadWatchlist,
    triggerDryRun,
    triggerFastReplay,
    handleDialChange,
    proposeChanges,
    confirmAndSaveDials,
    handleSaveConfig,
    discardDials,
  };
}

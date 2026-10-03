import { Router, Request, Response } from 'express';
import { EventEmitter } from 'events';
import { ScannerService } from '../services/scannerService';
import { PythonRunner } from '../services/pythonRunner';
import { PipelineDbService } from '../services/pipelineDbService';
import { ConfigDbService } from '../services/configDbService';
import { UniverseDbService } from '../services/universeDbService';
import { PATHS } from '../config/paths';

export const pipelineRouter = Router();

interface ActiveRunSession {
  runId: string;
  isDryRun: boolean;
  startTime: number;
  emitter: EventEmitter;
  isDone: boolean;
  bufferedEvents: Array<Record<string, unknown>>;
  latestResult?: Record<string, unknown>;
  childProcess?: any;
}

const activeRuns = new Map<string, ActiveRunSession>();
let currentRunningId: string | null = null;

function extractCandidateGateEvaluations(r: any, ticker: string): Array<{
  ticker: string;
  gate_id: number;
  passed: boolean;
  score?: number | null;
  reasoning?: string | null;
  sub_evaluations?: Record<string, any>;
}> {
  const cleanTicker = (ticker || r.ticker || r.symbol || '').toUpperCase().trim();

  if (Array.isArray(r.gate_evaluations) && r.gate_evaluations.length > 0) {
    return r.gate_evaluations.map((ge: any) => ({
      ticker: cleanTicker,
      gate_id: Number(ge.gate_id || ge.gate || 1),
      passed: Boolean(ge.passed !== false),
      score: ge.score !== undefined && ge.score !== null ? Number(ge.score) : null,
      reasoning: ge.reasoning || ge.reason || null,
      sub_evaluations: ge.sub_evaluations || ge.details || {},
    }));
  }

  if (r.gate_evaluations && typeof r.gate_evaluations === 'object' && Object.keys(r.gate_evaluations).length > 0) {
    return Object.entries(r.gate_evaluations).map(([gateKey, val]: [string, any]) => {
      const gateNum = parseInt(gateKey.replace(/\D/g, ''), 10) || 1;
      return {
        ticker: cleanTicker,
        gate_id: gateNum,
        passed: typeof val === 'object' ? Boolean(val.passed !== false) : Boolean(val),
        score: typeof val === 'object' && val.score !== undefined && val.score !== null ? Number(val.score) : null,
        reasoning: typeof val === 'object' ? (val.reasoning || val.reason || null) : null,
        sub_evaluations: typeof val === 'object' ? (val.sub_evaluations || val) : {},
      };
    });
  }

  // Derive deterministically from final_decision & telemetry properties
  const decision = String(r.final_decision || '').toUpperCase();
  const evals = [];

  // Gate 1: Hard Threat
  const g1Blocked = decision.startsWith('BLOCKED_G1');
  evals.push({
    ticker: cleanTicker,
    gate_id: 1,
    passed: !g1Blocked,
    score: null,
    reasoning: g1Blocked ? (r.notes || decision) : 'Cleared hard threat and volatility filters',
    sub_evaluations: {},
  });
  if (g1Blocked) return evals;

  // Gate 2: News Threat
  const g2Blocked = decision.startsWith('BLOCKED_G2');
  evals.push({
    ticker: cleanTicker,
    gate_id: 2,
    passed: !g2Blocked,
    score: null,
    reasoning: g2Blocked ? (r.notes || 'Catastrophic news event flagged') : 'Passed news threat safety check',
    sub_evaluations: {},
  });
  if (g2Blocked) return evals;

  // Gate 3: Sentiment
  const g3Blocked = decision.startsWith('BLOCKED_G3');
  evals.push({
    ticker: cleanTicker,
    gate_id: 3,
    passed: !g3Blocked,
    score: r.g3_confidence !== undefined && r.g3_confidence !== null ? Number(r.g3_confidence) : null,
    reasoning: g3Blocked ? (r.notes || 'Sentiment neutral/bearish or low conviction') : (r.g3_direction ? `Sentiment: ${r.g3_direction} (Confidence: ${r.g3_confidence}/10)` : 'Passed AI sentiment verification'),
    sub_evaluations: {
      direction: r.g3_direction || null,
      confidence: r.g3_confidence || null,
    },
  });
  if (g3Blocked) return evals;

  // Gate 4: Contradiction
  const g4Blocked = decision.startsWith('BLOCKED_G4');
  evals.push({
    ticker: cleanTicker,
    gate_id: 4,
    passed: !g4Blocked,
    score: null,
    reasoning: g4Blocked ? (r.notes || 'Contradiction flagged between stock and market backdrop') : 'Passed divergence and macro contradiction check',
    sub_evaluations: {},
  });
  if (g4Blocked) return evals;

  // Gate 5: Signal & Expected Value
  const isSkip = decision === 'SKIP';
  evals.push({
    ticker: cleanTicker,
    gate_id: 5,
    passed: !isSkip,
    score: r.ev !== undefined && r.ev !== null ? Number(r.ev) : null,
    reasoning: isSkip ? (r.notes || 'EV below required strategy hurdle') : (r.notes || 'BUY signal approved with positive EV'),
    sub_evaluations: {
      ev: r.ev !== undefined ? Number(r.ev) : null,
      win_prob: r.win_prob !== undefined ? Number(r.win_prob) : null,
      position_confidence: r.position_confidence || null,
      trade_levels: r.trade_levels || null,
      risk_sizing: r.risk_sizing || null,
    },
  });

  return evals;
}

/**
 * GET /api/pipeline/latest
 * Returns the most recent pipeline execution results and telemetry.
 */
pipelineRouter.get('/latest', (req: Request, res: Response) => {
  const data = ScannerService.getLatestRun();
  return res.json(data);
});

/**
 * GET /api/pipeline/runs
 * Returns historical pipeline run sessions stored in Neon PostgreSQL (Brisbane local time).
 */
pipelineRouter.get('/runs', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 30;
  const runs = await PipelineDbService.getRecentRuns(limit);
  return res.json({
    success: true,
    data: runs,
    count: runs.length,
  });
});

/**
 * POST /api/pipeline/runs
 * Explicit State Mutation: Creates a new pipeline execution session in Neon DB (pipeline_runs)
 * and spawns the Stage 2-6 Python analytical pipeline.
 */
pipelineRouter.post('/runs', async (req: Request, res: Response) => {
  const { run_universe, place_orders, ignore_market_hours, live_portfolio } = req.body || {};

  // Concurrency Guard
  if (currentRunningId && activeRuns.has(currentRunningId)) {
    const active = activeRuns.get(currentRunningId)!;
    if (!active.isDone) {
      return res.status(409).json({
        success: false,
        error: 'A pipeline execution is already in progress.',
        active_run_id: currentRunningId,
      });
    }
  }

  // Generate unique run_id
  const timestampStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const runId = `run_${timestampStr}_${randomSuffix}`;
  const startTime = Date.now();
  const isDryRun = !place_orders;

  // Fetch active strategy config preset for snapshot
  let activeConfig = null;
  try {
    activeConfig = await ConfigDbService.getActiveConfig();
  } catch (err) {
    console.warn('[pipelineRouter] Could not load active config for run metadata:', err);
  }

  // Explicit Database Insertion (pipeline_runs)
  const dbRun = await PipelineDbService.createRun({
    is_dry_run: isDryRun,
    config_id: activeConfig?.id || null,
  });

  const dbRunId = dbRun?.id;

  // Setup in-memory event broadcaster for this run
  const emitter = new EventEmitter();
  const stderrLines: string[] = [];
  const session: ActiveRunSession = {
    runId,
    isDryRun,
    startTime,
    emitter,
    isDone: false,
    bufferedEvents: [
      { log: `🚀 Initializing Momentum Scanner Pipeline (Run ID: ${runId})...`, run_id: runId },
    ],
  };

  activeRuns.set(runId, session);
  currentRunningId = runId;

  // Build Python args
  const args: string[] = [];
  if (run_universe) args.push('--run-universe');
  if (place_orders) args.push('--place-orders');
  if (ignore_market_hours) args.push('--ignore-market-hours');
  if (live_portfolio) args.push('--live-portfolio');

  // Spawn analytical subprocess
  const child = PythonRunner.spawnProcess({
    scriptPath: PATHS.pipelineFullScript,
    args,
    cwd: PATHS.root,
    onStdout: (chunk) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        if (line.startsWith('__CANDIDATE_UPDATE_JSON_START__')) {
          try {
            const jsonStr = line.replace('__CANDIDATE_UPDATE_JSON_START__', '').replace('__CANDIDATE_UPDATE_JSON_END__', '').trim();
            const candidate = JSON.parse(jsonStr);
            const evt = { candidate, run_id: runId };
            session.bufferedEvents.push(evt);
            emitter.emit('event', evt);
            continue;
          } catch {
            // ignore json parse error on partial line
          }
        }

        const evt = { log: line, run_id: runId };
        session.bufferedEvents.push(evt);
        emitter.emit('event', evt);
      }
    },
    onStderr: (chunk) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          stderrLines.push(line.trim());
          const evt = { log: `[stderr] ${line}`, run_id: runId };
          session.bufferedEvents.push(evt);
          emitter.emit('event', evt);
        }
      }
    },
  });

  session.childProcess = child;

  child.on('close', async (code) => {
    session.isDone = true;
    if (currentRunningId === runId) {
      currentRunningId = null;
    }

    const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
    const latest = ScannerService.getLatestRun();
    session.latestResult = latest;

    const results = Array.isArray(latest.results) ? (latest.results as Array<Record<string, any>>) : [];
    const totalCandidates = results.length;
    const passedCandidates = results.filter((r) =>
      r.final_decision === 'BUY' ||
      r.final_decision?.startsWith('PLACED') ||
      r.final_decision === 'QUEUED_MARKET_CLOSED'
    ).length;
    const ordersGenerated = results.filter((r) =>
      r.final_decision?.startsWith('PLACED') ||
      r.final_decision === 'QUEUED_MARKET_CLOSED'
    ).length;

    // Persist scanned_stocks into Neon PostgreSQL
    if (dbRunId && results.length > 0) {
      try {
        const latestUniverse = await UniverseDbService.getLatestUniverse();
        const batchId = latestUniverse.batch?.id || 1;

        const mappedStocks = results.map((r: any) => ({
          ticker: (r.ticker || r.symbol || 'UNKNOWN').toUpperCase().trim(),
          price: r.price !== undefined && r.price !== null ? Number(r.price) : null,
          final_decision: r.final_decision || 'PENDING',
          rule_evaluations: r.rule_evaluations || r.gate_evaluations || r.evaluations || {},
        }));

        await PipelineDbService.saveScannedStocks(dbRunId, batchId, mappedStocks);

        // Persist gate_evaluations into Neon PostgreSQL
        const gateEvaluationsToSave: Array<{
          ticker: string;
          gate_id: number;
          passed: boolean;
          score?: number | null;
          reasoning?: string | null;
          sub_evaluations?: Record<string, any>;
        }> = [];

        results.forEach((r: any) => {
          const ticker = (r.ticker || r.symbol || '').toUpperCase().trim();
          const evals = extractCandidateGateEvaluations(r, ticker);
          evals.forEach((ev) => gateEvaluationsToSave.push(ev));
        });

        if (gateEvaluationsToSave.length > 0) {
          await PipelineDbService.saveGateEvaluations(dbRunId, gateEvaluationsToSave);
        }

        // Persist order_executions into Neon PostgreSQL
        const ordersToSave: Array<{
          symbol: string;
          client_order_id?: string | null;
          alpaca_order_id?: string | null;
          side?: string | null;
          order_type?: string | null;
          qty: number;
          limit_price?: number | null;
          stop_loss?: number | null;
          take_profit?: number | null;
          filled_avg_price?: number | null;
          filled_qty?: number | null;
          status?: string | null;
          raw_response?: Record<string, any> | null;
        }> = [];

        results.forEach((r: any) => {
          const isOrderCandidate =
            r.final_decision?.startsWith('PLACED') ||
            r.final_decision === 'QUEUED_MARKET_CLOSED' ||
            r.final_decision === 'BUY' ||
            Boolean(r.execution_audit) ||
            Boolean(r.order_audit) ||
            Boolean(r.exec_audit);

          const audit = r.execution_audit || r.order_audit || r.exec_audit || {};
          const riskSizing = r.risk_sizing || r.position_sizing || {};
          const tradeLevels = r.trade_levels || {};
          const qty = Number(audit.filled_qty || riskSizing.shares || r.shares || 0);

          if (isOrderCandidate && qty > 0) {
            const symbol = (r.ticker || r.symbol || 'UNKNOWN').toUpperCase().trim();
            ordersToSave.push({
              symbol,
              client_order_id: audit.client_order_id || `RUN_${dbRunId.substring(0, 8)}_${symbol}_${Date.now()}`,
              alpaca_order_id: audit.entry_order_id || audit.id || audit.alpaca_order_id || null,
              side: audit.side || 'BUY',
              order_type: audit.order_type || 'MARKET',
              qty,
              limit_price: tradeLevels.entry !== undefined && tradeLevels.entry !== null ? Number(tradeLevels.entry) : (tradeLevels.entry_price || r.price || null),
              stop_loss: tradeLevels.stop !== undefined && tradeLevels.stop !== null ? Number(tradeLevels.stop) : (tradeLevels.stop_loss || (r.price && tradeLevels.stop_pct ? r.price * (1 - tradeLevels.stop_pct) : null)),
              take_profit: tradeLevels.target !== undefined && tradeLevels.target !== null ? Number(tradeLevels.target) : (tradeLevels.target_price || null),
              filled_avg_price: audit.filled_avg_price !== undefined && audit.filled_avg_price !== null ? Number(audit.filled_avg_price) : (r.filled_avg_price ? Number(r.filled_avg_price) : null),
              filled_qty: audit.filled_qty !== undefined && audit.filled_qty !== null ? Number(audit.filled_qty) : (r.filled_qty ? Number(r.filled_qty) : (audit.status === 'filled' ? qty : 0)),
              status: audit.status || (r.final_decision === 'QUEUED_MARKET_CLOSED' ? 'QUEUED' : 'ACCEPTED'),
              raw_response: audit,
            });
          }
        });

        if (ordersToSave.length > 0) {
          console.log(`[pipelineRouter] Persisting ${ordersToSave.length} order executions to Neon for run ${dbRunId}...`);
          const savedOrders = await PipelineDbService.saveOrderExecutions(dbRunId, ordersToSave);
          console.log(`[pipelineRouter] Successfully saved ${savedOrders.length} order executions to Neon.`);
        }
      } catch (stockErr) {
        console.error('[pipelineRouter] Failed to persist scanned_stocks, gate_evaluations, and order_executions for run:', stockErr);
      }
    }

    // Complete pipeline_runs record in Neon PostgreSQL
    if (dbRunId) {
      try {
        const specificError = stderrLines.length > 0
          ? stderrLines.slice(-3).join(' | ')
          : `Pipeline exited with non-zero exit code: ${code}`;

        await PipelineDbService.completeRun(dbRunId, {
          status: code === 0 ? 'SUCCESS' : 'FAILED',
          total_candidates: totalCandidates,
          orders_generated: ordersGenerated,
          error_message: code === 0 ? null : specificError,
        });
      } catch (dbErr) {
        console.error('[pipelineRouter] Failed to update completed pipeline_run row:', dbErr);
      }
    }

    const specificErrorMsg = stderrLines.length > 0
      ? stderrLines.slice(-3).join(' | ')
      : `Pipeline exited with non-zero exit code: ${code}`;

    const finishEvt = code === 0
      ? {
          result: latest,
          run_id: runId,
          log: `✅ Pipeline execution completed successfully (Run ID: ${runId}, ${durationSeconds}s).`,
          done: true,
        }
      : {
          error: specificErrorMsg,
          run_id: runId,
          result: latest.status === 'success' ? latest : undefined,
          done: true,
        };

    session.bufferedEvents.push(finishEvt);
    emitter.emit('event', finishEvt);
  });

  return res.status(201).json({
    success: true,
    run_id: runId,
    status: 'RUNNING',
    stream_url: `/api/pipeline/runs/${runId}/stream`,
    run: dbRun,
  });
});

/**
 * GET /api/pipeline/runs/:runId/stream
 * Dedicated read-only SSE stream subscriber for an active or completed run session.
 */
pipelineRouter.get('/runs/:runId/stream', (req: Request, res: Response) => {
  const { runId } = req.params;
  const session = activeRuns.get(runId);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (!session) {
    sendEvent({
      error: `Run session '${runId}' not found.`,
      done: true,
    });
    res.end();
    return;
  }

  // Replay buffered events
  for (const evt of session.bufferedEvents) {
    sendEvent(evt);
  }

  // If already finished, close stream
  if (session.isDone) {
    res.end();
    return;
  }

  // Subscribe to live events
  const onEvent = (data: Record<string, unknown>) => {
    sendEvent(data);
    if (data.done) {
      session.emitter.off('event', onEvent);
      res.end();
    }
  };

  session.emitter.on('event', onEvent);

  req.on('close', () => {
    session.emitter.off('event', onEvent);
  });
});

/**
 * GET /api/pipeline/runs/:runId/scanned-stocks
 * Strict Read-Only Endpoint: Returns all candidate stocks evaluated in a specific run.
 */
pipelineRouter.get('/runs/:runId/scanned-stocks', async (req: Request, res: Response) => {
  const { runId } = req.params;
  try {
    const stocks = await PipelineDbService.getScannedStocksForRun(runId);
    return res.json({
      success: true,
      run_id: runId,
      data: stocks,
      count: stocks.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch scanned stocks for run',
    });
  }
});

/**
 * POST /api/pipeline/runs/:runId/scanned-stocks
 * Explicit State Mutation: Bulk inserts candidate stock evaluation rows into scanned_stocks.
 */
pipelineRouter.post('/runs/:runId/scanned-stocks', async (req: Request, res: Response) => {
  const { runId } = req.params;
  const { stocks, batch_id } = req.body || {};

  if (!Array.isArray(stocks) || stocks.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Body must contain a non-empty "stocks" array.',
    });
  }

  try {
    let resolvedBatchId = batch_id;
    if (!resolvedBatchId) {
      const latestUniverse = await UniverseDbService.getLatestUniverse();
      resolvedBatchId = latestUniverse.batch?.id || 1;
    }

    const saved = await PipelineDbService.saveScannedStocks(runId, resolvedBatchId, stocks);
    return res.status(201).json({
      success: true,
      run_id: runId,
      batch_id: resolvedBatchId,
      data: saved,
      count: saved.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to persist scanned stocks',
    });
  }
});

/**
 * GET /api/pipeline/runs/:runId/gate-evaluations
 * Strict Read-Only Endpoint: Returns all gate evaluation records for a specific run session.
 */
pipelineRouter.get('/runs/:runId/gate-evaluations', async (req: Request, res: Response) => {
  const { runId } = req.params;
  try {
    const evaluations = await PipelineDbService.getGateEvaluationsForRun(runId);
    return res.json({
      success: true,
      run_id: runId,
      data: evaluations,
      count: evaluations.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch gate evaluations for run',
    });
  }
});

/**
 * POST /api/pipeline/runs/:runId/gate-evaluations
 * Explicit State Mutation: Bulk persists gate evaluation records into gate_evaluations in Neon DB.
 */
pipelineRouter.post('/runs/:runId/gate-evaluations', async (req: Request, res: Response) => {
  const { runId } = req.params;
  const { evaluations } = req.body || {};

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Body must contain a non-empty "evaluations" array.',
    });
  }

  try {
    const saved = await PipelineDbService.saveGateEvaluations(runId, evaluations);
    return res.status(201).json({
      success: true,
      run_id: runId,
      data: saved,
      count: saved.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to persist gate evaluations',
    });
  }
});

/**
 * GET /api/pipeline/runs/:runId/order-executions
 * Strict Read-Only Endpoint: Returns all generated order execution tickets for a specific run.
 */
pipelineRouter.get('/runs/:runId/order-executions', async (req: Request, res: Response) => {
  const { runId } = req.params;
  try {
    const orders = await PipelineDbService.getOrderExecutionsForRun(runId);
    return res.json({
      success: true,
      run_id: runId,
      data: orders,
      count: orders.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch order executions for run',
    });
  }
});

/**
 * POST /api/pipeline/runs/:runId/order-executions
 * Explicit State Mutation: Bulk persists order execution tickets into order_executions in Neon DB.
 */
pipelineRouter.post('/runs/:runId/order-executions', async (req: Request, res: Response) => {
  const { runId } = req.params;
  const { orders } = req.body || {};

  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Body must contain a non-empty "orders" array.',
    });
  }

  try {
    const saved = await PipelineDbService.saveOrderExecutions(runId, orders);
    return res.status(201).json({
      success: true,
      run_id: runId,
      data: saved,
      count: saved.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to persist order executions',
    });
  }
});



import { Router, Request, Response } from 'express';
import { EventEmitter } from 'events';
import { ScannerService } from '../services/scannerService';
import { PythonRunner } from '../services/pythonRunner';
import { PipelineDbService } from '../services/pipelineDbService';
import { ConfigDbService, toStrategyEnv } from '../services/configDbService';
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

  // The run uses the active strategy config and is recorded in pipeline_runs; if either fails, nothing starts
  let activeConfig;
  let dbRun;
  try {
    activeConfig = await ConfigDbService.getActiveConfig();
    dbRun = await PipelineDbService.createRun({
      is_dry_run: isDryRun,
      config_id: activeConfig.id,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }

  const dbRunId = dbRun.id;

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
    env: toStrategyEnv(activeConfig),
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
    // Results are saved only when Python finished: after a crash, latest_run.json still holds the previous run
    let runError: string | null = code === 0
      ? null
      : (stderrLines.length > 0 ? stderrLines.slice(-3).join(' | ') : `Pipeline exited with non-zero exit code: ${code}`);
    let latest = null;
    let results: Array<Record<string, any>> = [];

    if (code === 0) {
      try {
        latest = ScannerService.getLatestRun();
        results = latest.results as Array<Record<string, any>>;

        // The run scanned the latest universe batch; without one there is nothing to link it to
        const { batch } = await UniverseDbService.getLatestUniverse();
        if (!batch) {
          throw new Error('No universe batch in Neon to link this run to');
        }

        await PipelineDbService.saveScannedStocks(dbRunId, batch.id, results.map((r) => ({
          ticker: r.ticker,
          final_decision: r.final_decision,
          rule_evaluations: r.scan,
        })));

        await PipelineDbService.saveGateEvaluations(dbRunId, results.flatMap((r) =>
          r.gate_evaluations.map((ge: Record<string, any>) => ({ ticker: r.ticker, ...ge }))
        ));

        await PipelineDbService.saveOrderExecutions(dbRunId, results
          .filter((r) => r.order)
          .map((r) => ({ symbol: r.ticker, ...r.order })));
      } catch (saveErr: any) {
        runError = `Saving run results to Neon failed: ${saveErr.message}`;
      }
    }
    session.latestResult = latest ?? undefined;

    // Orders actually sent to Alpaca; SIMULATED rows are not orders
    const ordersGenerated = results.filter((r) => r.order && r.order.status !== 'SIMULATED').length;

    try {
      await PipelineDbService.completeRun(dbRunId, {
        status: runError === null ? 'SUCCESS' : 'FAILED',
        total_candidates: results.length,
        orders_generated: ordersGenerated,
        error_message: runError,
      });
    } catch (dbErr: any) {
      runError = `Could not mark the run as finished in Neon: ${dbErr.message}`;
      console.error('[pipelineRouter]', runError);
    }

    const finishEvt = runError === null
      ? {
          result: latest,
          run_id: runId,
          log: `✅ Pipeline execution completed successfully (Run ID: ${runId}, ${durationSeconds}s).`,
          done: true,
        }
      : {
          error: runError,
          run_id: runId,
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



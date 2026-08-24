import { Router, Request, Response } from 'express';
import { ScannerService } from '../services/scannerService';
import { PythonRunner } from '../services/pythonRunner';
import { PATHS } from '../config/paths';

export const scannerRouter = Router();

// GET /api/universe (and /api/scanner/universe)
scannerRouter.get('/universe', (req: Request, res: Response) => {
  const result = ScannerService.getUniverse();
  if (!result.exists || !result.data) {
    return res.json({
      tickers: [],
      status: 'no_data',
      message: 'Universe has not been generated yet. Click "Refresh Universe" to scan.',
    });
  }
  return res.json(result.data);
});

// GET /api/universe/status
scannerRouter.get('/universe/status', (req: Request, res: Response) => {
  const result = ScannerService.getUniverse();
  return res.json({
    exists: result.exists,
    lastModified: result.lastModified || null,
    count: result.data?.tickers?.length || 0,
  });
});

// POST /api/universe/refresh and POST /api/universe/generate
const handleRefreshUniverse = async (req: Request, res: Response) => {
  const result = await ScannerService.refreshUniverse();
  if (!result.success) {
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh universe',
      details: result.error,
    });
  }
  const universe = result.data;
  const count = Array.isArray(universe) ? universe.length : (universe?.tickers?.length || 0);
  return res.json({
    success: true,
    status: 'success',
    count,
    message: 'Universe updated successfully',
    data: universe,
  });
};

scannerRouter.post('/universe/refresh', handleRefreshUniverse);
scannerRouter.post('/universe/generate', handleRefreshUniverse);

// GET /api/run/latest (and /api/pipeline/latest)
scannerRouter.get('/run/latest', (req: Request, res: Response) => {
  const data = ScannerService.getLatestRun();
  return res.json(data);
});

// Backward compatibility alias for /api/pipeline/latest
scannerRouter.get('/pipeline/latest', (req: Request, res: Response) => {
  const data = ScannerService.getLatestRun();
  return res.json(data);
});

// GET /api/run/pipeline-fast (SSE Stream for Fast Scan)
scannerRouter.get('/run/pipeline-fast', (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || '';

  // Setup Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent('log', { message: '🚀 Initializing Fast Pipeline Scan...' });

  const args: string[] = [];
  if (symbol) {
    args.push('--symbol', symbol);
  }

  const child = PythonRunner.spawnProcess({
    scriptPath: PATHS.pipelineFastScript,
    args,
    cwd: PATHS.root,
    onStdout: (chunk) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          sendEvent('log', { message: line });
        }
      }
    },
    onStderr: (chunk) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          sendEvent('error', { message: line });
        }
      }
    },
  });

  child.on('close', (code) => {
    if (code === 0) {
      const latest = ScannerService.getLatestRun();
      sendEvent('complete', {
        status: 'success',
        results: latest.results || [],
      });
    } else {
      sendEvent('complete', {
        status: 'error',
        message: `Pipeline exited with code ${code}`,
      });
    }
    res.end();
  });

  req.on('close', () => {
    child.kill();
  });
});

// GET /api/run/trigger (SSE Stream for Full Scanner Pipeline)
let isPipelineRunning = false;

scannerRouter.get('/run/trigger', (req: Request, res: Response) => {
  const runUniverse = req.query.runUniverse === 'true';
  const placeOrders = req.query.placeOrders === 'true';
  const ignoreMarketHours = req.query.ignoreMarketHours === 'true';
  const livePortfolio = req.query.livePortfolio === 'true';

  // Setup Server-Sent Events headers
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

  // Concurrency Guard: Prevent multiple concurrent runs
  if (isPipelineRunning) {
    sendEvent({
      error: 'A scanner pipeline run is already in progress. Please wait for it to complete.',
      done: true,
    });
    res.end();
    return;
  }

  isPipelineRunning = true;

  sendEvent({ log: '🚀 Initializing Momentum Scanner Pipeline...' });

  const args: string[] = [];
  if (runUniverse) args.push('--run-universe');
  if (placeOrders) args.push('--place-orders');
  if (ignoreMarketHours) args.push('--ignore-market-hours');
  if (livePortfolio) args.push('--live-portfolio');

  const child = PythonRunner.spawnProcess({
    scriptPath: PATHS.pipelineFullScript,
    args,
    cwd: PATHS.root,
    onStdout: (chunk) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        // Check if stdout contains candidate or result JSON
        if (line.startsWith('__CANDIDATE_UPDATE_JSON_START__')) {
          try {
            const jsonStr = line.replace('__CANDIDATE_UPDATE_JSON_START__', '').replace('__CANDIDATE_UPDATE_JSON_END__', '').trim();
            const candidate = JSON.parse(jsonStr);
            sendEvent({ candidate });
            continue;
          } catch {
            // ignore json parse error on partial line
          }
        }

        sendEvent({ log: line });
      }
    },
    onStderr: (chunk) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          sendEvent({ log: `[stderr] ${line}` });
        }
      }
    },
  });

  child.on('close', (code) => {
    isPipelineRunning = false;
    const latest = ScannerService.getLatestRun();

    if (code === 0) {
      sendEvent({
        result: latest,
        log: '✅ Pipeline execution completed successfully.',
        done: true,
      });
    } else {
      sendEvent({
        error: `Pipeline exited with non-zero exit code: ${code}`,
        result: latest.status === 'success' ? latest : undefined,
        done: true,
      });
    }
    res.end();
  });

  req.on('close', () => {
    if (isPipelineRunning) {
      console.log('[scannerRouter] Client disconnected, terminating pipeline subprocess...');
      child.kill('SIGTERM');
      isPipelineRunning = false;
    }
  });
});


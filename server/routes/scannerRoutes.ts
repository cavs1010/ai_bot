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

// GET /api/run/live (SSE Stream for Full Scan with AI Gate 4)
scannerRouter.get('/run/live', (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || '';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent('log', { message: '🚀 Starting Full Pipeline Run (AI Gate 4 Active)...' });

  const args: string[] = [];
  if (symbol) {
    args.push('--symbol', symbol);
  }

  const child = PythonRunner.spawnProcess({
    scriptPath: PATHS.pipelineFullScript,
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

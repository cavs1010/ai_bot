import { Router, Request, Response } from 'express';
import { ScannerService } from '../services/scannerService';

export const universeRouter = Router();

/**
 * GET /api/universe
 * Returns active universe watchlist tickers and stock details from Neon DB.
 */
universeRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await ScannerService.getUniverseAsync();
    if (!result.data) {
      return res.json({
        success: true,
        data: [],
        tickers: [],
        status: 'no_data',
        message: 'Universe has not been generated yet. Click "Load Watchlist" to scan.',
      });
    }
    return res.json({
      success: true,
      data: result.data.stocks,
      tickers: result.data.tickers,
      count: result.data.stocks.length,
      status: 'success',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/universe/status
 * Returns timestamp and ticker count for universe status checks.
 */
universeRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const result = await ScannerService.getUniverseAsync();
    return res.json({
      exists: result.exists,
      lastModified: result.data ? result.data.generated_at : null,
      count: result.data ? result.data.tickers.length : null,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/universe/refresh and POST /api/universe/generate
 * Triggers Stage 1 filter script and creates a new scan batch in Neon DB.
 */
const handleRefreshUniverse = async (req: Request, res: Response) => {
  try {
    const result = await ScannerService.refreshUniverse();
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to refresh universe',
        details: result.error,
      });
    }
    return res.json({
      success: true,
      status: 'success',
      count: result.count,
      batch_id: result.batch!.id,
      message: `Universe watchlist saved to Neon as batch #${result.batch!.id}`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Unexpected server error while refreshing universe',
      details: err?.message || String(err),
    });
  }
};

universeRouter.post('/refresh', handleRefreshUniverse);
universeRouter.post('/generate', handleRefreshUniverse);
// Graceful GET handlers for direct browser inspection or GET calls
universeRouter.get('/generate', handleRefreshUniverse);
universeRouter.get('/refresh', handleRefreshUniverse);

import { Router, Request, Response } from 'express';
import { AlpacaService } from '../services/alpacaService';
import { PortfolioDbService, PositionDetail } from '../services/portfolioDbService';

export const portfolioRouter = Router();

// GET /api/portfolio/account
portfolioRouter.get('/account', async (req: Request, res: Response) => {
  try {
    const account = await AlpacaService.getAccount();
    res.json(account);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    res.status(error.statusCode || 500).json({
      error: 'Failed to fetch account info',
      details: error.message || String(err),
    });
  }
});

// GET /api/portfolio/positions
portfolioRouter.get('/positions', async (req: Request, res: Response) => {
  try {
    const positions = await AlpacaService.getPositions();
    res.json(positions);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    res.status(error.statusCode || 500).json({
      error: 'Failed to fetch positions',
      details: error.message || String(err),
    });
  }
});

// GET /api/portfolio/orders
portfolioRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'all';
    const limit = parseInt(req.query.limit as string) || 50;
    const orders = await AlpacaService.getOrders(status, limit);
    res.json(orders);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    res.status(error.statusCode || 500).json({
      error: 'Failed to fetch orders',
      details: error.message || String(err),
    });
  }
});

// GET /api/portfolio/live (Strictly Read-Only & Idempotent)
portfolioRouter.get('/live', async (req: Request, res: Response) => {
  try {
    const [account, positions] = await Promise.all([
      AlpacaService.getAccount() as Promise<{
        portfolio_value?: string;
        equity?: string;
        last_equity?: string;
        cash?: string;
        buying_power?: string;
        status?: string;
      }>,
      AlpacaService.getPositions() as Promise<Array<unknown>>,
    ]);

    const equity = parseFloat(account.equity || account.portfolio_value || '100000');
    const lastEquity = parseFloat(account.last_equity || String(equity));
    const rawDailyPnl = equity - lastEquity;
    const dailyPnl = Math.round(rawDailyPnl * 100) / 100;
    const dailyPnlPct = lastEquity > 0 ? Math.round(((rawDailyPnl / lastEquity) * 100) * 100) / 100 : 0.0;
    const openPositions = Array.isArray(positions) ? positions.length : 0;
    const cash = parseFloat(account.cash || '0');
    const buyingPower = parseFloat(account.buying_power || '0');

    return res.json({
      success: true,
      value: equity,
      daily_pnl: dailyPnl,
      daily_pnl_pct: dailyPnlPct,
      open_positions: openPositions,
      drawdown_pct: 0.0,
      cash,
      buying_power: buyingPower,
      status: account.status || 'ACTIVE',
    });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to connect to Alpaca API',
      details: String(err),
    });
  }
});

/**
 * POST /api/portfolio/snapshots
 * Explicit State Mutation: Captures current Alpaca state and creates a persistent snapshot in Neon DB (portfolio_snapshots).
 */
const handleCreateSnapshot = async (req: Request, res: Response) => {
  try {
    const triggerSource = req.body?.trigger_source || 'MANUAL_UPDATE';
    const [account, positions] = await Promise.all([
      AlpacaService.getAccount() as Promise<{
        portfolio_value?: string;
        equity?: string;
        last_equity?: string;
        cash?: string;
        buying_power?: string;
        status?: string;
      }>,
      AlpacaService.getPositions() as Promise<Array<unknown>>,
    ]);

    const equity = parseFloat(account.equity || account.portfolio_value || '100000');
    const lastEquity = parseFloat(account.last_equity || String(equity));
    const rawDailyPnl = equity - lastEquity;
    const dailyPnl = Math.round(rawDailyPnl * 100) / 100;
    const dailyPnlPct = lastEquity > 0 ? Math.round(((rawDailyPnl / lastEquity) * 100) * 100) / 100 : 0.0;
    const cash = parseFloat(account.cash || '0');
    const buyingPower = parseFloat(account.buying_power || '0');

    const formattedPositions: PositionDetail[] = Array.isArray(positions)
      ? positions.map((p: any) => ({
          ticker: p.symbol || '',
          shares: parseFloat(p.qty || '0'),
          avg_entry_price: parseFloat(p.avg_entry_price || '0'),
          current_price: parseFloat(p.current_price || '0'),
          market_value: parseFloat(p.market_value || '0'),
          unrealized_pnl: parseFloat(p.unrealized_pl || '0'),
          unrealized_pnl_pct: parseFloat(p.unrealized_plpc || '0') * 100,
        }))
      : [];

    const savedSnapshot = await PortfolioDbService.saveSnapshot({
      trigger_source: triggerSource,
      total_equity: equity,
      cash,
      buying_power: buyingPower,
      day_pnl: dailyPnl,
      day_pnl_pct: dailyPnlPct,
      positions: formattedPositions,
    });

    return res.status(201).json({
      success: true,
      data: savedSnapshot,
      message: 'Portfolio snapshot persisted to Neon DB successfully.',
    });
  } catch (err: any) {
    console.error('[Portfolio API] Failed to create snapshot:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create and persist portfolio snapshot',
      details: err.message || String(err),
    });
  }
};

portfolioRouter.post('/snapshots', handleCreateSnapshot);
portfolioRouter.post('/snapshot', handleCreateSnapshot);

// GET /api/portfolio/snapshots (Retrieve snapshot history from Neon)
portfolioRouter.get('/snapshots', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;
    const snapshots = await PortfolioDbService.getSnapshotHistory(limit);
    res.json({
      success: true,
      count: snapshots.length,
      snapshots,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    res.status(500).json({
      success: false,
      error: 'Failed to fetch snapshots from Neon Database',
      details: error.message || String(err),
    });
  }
});

// GET /api/portfolio/snapshots/latest (Retrieve most recent snapshot)
portfolioRouter.get('/snapshots/latest', async (req: Request, res: Response) => {
  try {
    const snapshot = await PortfolioDbService.getLatestSnapshot();
    res.json({
      success: true,
      snapshot,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest snapshot from Neon Database',
      details: error.message || String(err),
    });
  }
});

// GET /api/portfolio/history
portfolioRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '1M';
    const timeframe = (req.query.timeframe as string) || '1D';
    const history = await AlpacaService.getPortfolioHistory(period, timeframe);
    res.json(history);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    res.status(error.statusCode || 500).json({
      error: 'Failed to fetch portfolio history',
      details: error.message || String(err),
    });
  }
});

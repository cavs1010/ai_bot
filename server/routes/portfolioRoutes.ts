import { Router, Request, Response } from 'express';
import { AlpacaService } from '../services/alpacaService';

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

// GET /api/portfolio/live
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
    const dailyPnl = equity - lastEquity;
    const dailyPnlPct = lastEquity > 0 ? (dailyPnl / lastEquity) * 100 : 0.0;
    const openPositions = Array.isArray(positions) ? positions.length : 0;

    return res.json({
      success: true,
      value: equity,
      daily_pnl: dailyPnl,
      daily_pnl_pct: dailyPnlPct,
      open_positions: openPositions,
      drawdown_pct: 0.0,
      cash: parseFloat(account.cash || '0'),
      buying_power: parseFloat(account.buying_power || '0'),
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

import fs from 'fs';
import { PATHS } from '../config/paths';
import { PythonRunner } from './pythonRunner';
import { UniverseDbService, UniverseStockItem } from './universeDbService';

export interface UniverseData {
  tickers: string[];
  total_scanned?: number;
  total_passed?: number;
  generated_at?: string;
  filters?: Record<string, unknown>;
  stocks?: Array<{
    symbol?: string;
    ticker?: string;
    price: number;
    volume?: number;
    sector?: string;
    pe?: number;
    atr?: number;
    atr_pct?: number;
    rsi?: number;
    sma20?: number;
    sma50?: number;
    adv20_dollars?: number;
    sma200?: number;
    price_to_sma200?: number;
  }>;
}

export interface LatestRunData {
  status: string;
  results: unknown[];
  timestamp?: string;
  run_id?: string;
  [key: string]: unknown;
}

export class ScannerService {
  /**
   * Reads universe from PostgreSQL universe_watchlist_items (latest batch) with disk fallback
   */
  static async getUniverseAsync(): Promise<{ exists: boolean; data: UniverseData | null; lastModified?: string }> {
    try {
      const { batch, items } = await UniverseDbService.getLatestUniverse();
      if (batch && items.length > 0) {
        const tickers = items.map(s => s.ticker);
        const lastUpdated = batch.scanned_at || new Date().toISOString();
        return {
          exists: true,
          data: {
            tickers,
            total_passed: items.length,
            generated_at: lastUpdated,
            stocks: items.map(s => ({
              symbol: s.ticker,
              ticker: s.ticker,
              price: s.price,
              volume: s.volume,
              atr: s.atr,
              atr_pct: s.atr_pct,
              rsi: s.rsi,
              sma20: s.sma20,
              sma50: s.sma50,
              sector: s.sector,
            })),
          },
          lastModified: lastUpdated,
        };
      }
    } catch (err) {
      console.warn('[ScannerService] Failed to query PostgreSQL universe batches, falling back to disk:', err);
    }

    return this.getUniverse();
  }

  /**
   * Reads universe.json from disk with fallback
   */
  static getUniverse(): { exists: boolean; data: UniverseData | null; lastModified?: string } {
    const universePath = PATHS.universeJson;
    if (!fs.existsSync(universePath)) {
      return { exists: false, data: null };
    }

    try {
      const content = fs.readFileSync(universePath, 'utf-8');
      const rawData = JSON.parse(content);
      const stats = fs.statSync(universePath);

      // Handle array format [ { ticker, price, ... } ] or object format { tickers: [...] }
      let formattedData: UniverseData;
      if (Array.isArray(rawData)) {
        formattedData = {
          tickers: rawData.map((item: any) => item.ticker || item.symbol).filter(Boolean),
          total_passed: rawData.length,
          generated_at: stats.mtime.toISOString(),
          stocks: rawData,
        };
      } else {
        formattedData = rawData;
      }

      return {
        exists: true,
        data: formattedData,
        lastModified: stats.mtime.toISOString(),
      };
    } catch (err) {
      console.error('Error reading universe.json:', err);
      return { exists: false, data: null };
    }
  }

  /**
   * Refreshes universe list by executing Python filter and syncing directly to PostgreSQL universe_watchlist
   */
  static async refreshUniverse(): Promise<{ success: boolean; data?: UniverseData; error?: string }> {
    // Ensure data directory exists
    if (!fs.existsSync(PATHS.scannerData)) {
      fs.mkdirSync(PATHS.scannerData, { recursive: true });
    }

    try {
      const result = await PythonRunner.runToCompletion({
        scriptPath: PATHS.universeScript,
        cwd: PATHS.root,
      });

      let parsedStocks: UniverseStockItem[] = [];

      if (result.code !== 0) {
        console.error('[ScannerService] Python universe script failed:', result.stderr || result.stdout);
        return {
          success: false,
          error: result.stderr || result.stdout || 'Universe filter script exited with non-zero code',
        };
      }

      // Read output and sync to PostgreSQL as a new historical scan batch
      const universePath = PATHS.universeJson;
      if (fs.existsSync(universePath)) {
        try {
          const content = fs.readFileSync(universePath, 'utf-8');
          const rawData = JSON.parse(content);
          if (Array.isArray(rawData)) {
            parsedStocks = rawData.map((item: any) => ({
              ticker: item.ticker || item.symbol,
              price: item.price || 0,
              volume: item.volume,
              atr: item.atr,
              atr_pct: item.atr_pct,
              rsi: item.rsi,
              sma20: item.sma20,
              sma50: item.sma50,
              sector: item.sector,
            })).filter(s => !!s.ticker);

            const batch = await UniverseDbService.createScanBatchWithItems(parsedStocks);
            if (batch) {
              console.log(`[ScannerService] Successfully saved historical scan batch #${batch.id} with ${parsedStocks.length} tickers.`);
            }
          }
        } catch (dbErr) {
          console.error('[ScannerService] Failed to sync universe batch to database:', dbErr);
        }
      }

      const universe = await this.getUniverseAsync();
      const finalData = universe.data || (parsedStocks.length > 0 ? {
        tickers: parsedStocks.map(s => s.ticker),
        total_passed: parsedStocks.length,
        generated_at: new Date().toISOString(),
        stocks: parsedStocks,
      } : undefined);

      return {
        success: true,
        data: finalData,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ScannerService] Unexpected error in refreshUniverse:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Gets latest scan run data or returns empty state on fresh deployment
   */
  static getLatestRun(): LatestRunData {
    const runPath = PATHS.latestRunJson;
    if (!fs.existsSync(runPath)) {
      return {
        status: 'no_data',
        results: [],
        message: 'No scan runs have been performed yet in this deployment.',
      };
    }

    try {
      const content = fs.readFileSync(runPath, 'utf-8');
      const data = JSON.parse(content);
      return {
        status: 'success',
        ...data,
      };
    } catch (err) {
      console.error('Error reading latest_run.json:', err);
      return {
        status: 'error',
        results: [],
        message: 'Error reading latest run data.',
      };
    }
  }
}

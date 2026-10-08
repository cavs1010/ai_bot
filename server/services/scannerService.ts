import fs from 'fs';
import { PATHS } from '../config/paths';
import { PythonRunner } from './pythonRunner';
import { ConfigDbService, toStrategyEnv } from './configDbService';
import { UniverseDbService, UniverseScanBatch, UniverseStockItem } from './universeDbService';

// Prefix of the stdout line carrying the filtered universe, printed by backend/01_scanner/universe_filter.py
const UNIVERSE_LINE_PREFIX = '__UNIVERSE_JSON__ ';

// The latest Neon universe batch, as returned by GET /api/universe
export interface UniverseData {
  tickers: string[];
  total_passed: number;
  generated_at: string;
  stocks: UniverseStockItem[];
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
   * Reads the universe from the latest Neon batch (universe_scan_batches + universe_watchlist_items).
   * Neon is the only copy; errors propagate to the caller.
   */
  static async getUniverseAsync(): Promise<{ exists: boolean; data: UniverseData | null; lastModified?: string }> {
    const { batch, items } = await UniverseDbService.getLatestUniverse();
    if (!batch) {
      return { exists: false, data: null };
    }
    return {
      exists: true,
      data: {
        tickers: items.map((s) => s.ticker),
        total_passed: items.length,
        generated_at: batch.scanned_at,
        stocks: items.map((s) => ({
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
      lastModified: batch.scanned_at,
    };
  }

  /**
   * Load Watchlist: runs the Python universe filter, reads the universe it prints on stdout,
   * and saves it as a new Neon batch. Node is the only database writer (Rule 20); no file is used.
   */
  static async refreshUniverse(): Promise<{ success: boolean; batch?: UniverseScanBatch; count?: number; error?: string }> {
    try {
      // The universe filter uses the active strategy config; without one, it throws here
      const activeConfig = await ConfigDbService.getActiveConfig();
      const result = await PythonRunner.runToCompletion({
        scriptPath: PATHS.universeScript,
        cwd: PATHS.root,
        env: toStrategyEnv(activeConfig),
      });

      if (result.code !== 0) {
        console.error('[ScannerService] Python universe script failed:', result.stderr);
        return { success: false, error: result.stderr };
      }

      const line = result.stdout.split('\n').find((l: string) => l.startsWith(UNIVERSE_LINE_PREFIX));
      if (!line) {
        return { success: false, error: 'Universe filter finished without printing the universe' };
      }
      const stocks: UniverseStockItem[] = JSON.parse(line.slice(UNIVERSE_LINE_PREFIX.length));

      const batch = await UniverseDbService.createScanBatchWithItems(stocks);
      console.log(`[ScannerService] Saved universe batch #${batch.id} with ${stocks.length} tickers.`);
      return { success: true, batch, count: stocks.length };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ScannerService] Load Watchlist failed:', msg);
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

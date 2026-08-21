import fs from 'fs';
import { PATHS } from '../config/paths';
import { PythonRunner } from './pythonRunner';

export interface UniverseData {
  tickers: string[];
  total_scanned?: number;
  total_passed?: number;
  generated_at?: string;
  filters?: Record<string, unknown>;
  stocks?: Array<{
    symbol: string;
    price: number;
    volume?: number;
    sector?: string;
    pe?: number;
    atr?: number;
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
   * Reads universe.json from disk with fallback
   */
  static getUniverse(): { exists: boolean; data: UniverseData | null; lastModified?: string } {
    const universePath = PATHS.universeJson;
    if (!fs.existsSync(universePath)) {
      return { exists: false, data: null };
    }

    try {
      const content = fs.readFileSync(universePath, 'utf-8');
      const data = JSON.parse(content);
      const stats = fs.statSync(universePath);
      return {
        exists: true,
        data,
        lastModified: stats.mtime.toISOString(),
      };
    } catch (err) {
      console.error('Error reading universe.json:', err);
      return { exists: false, data: null };
    }
  }

  /**
   * Refreshes universe list by executing Python filter
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

      if (result.code !== 0) {
        return {
          success: false,
          error: result.stderr || 'Universe script exited with non-zero code',
        };
      }

      const universe = this.getUniverse();
      return {
        success: true,
        data: universe.data || undefined,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
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

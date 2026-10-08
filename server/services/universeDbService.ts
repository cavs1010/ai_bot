import { dbPool } from '../db/pool';

export interface UniverseScanBatch {
  id: number;
  scanned_at: string;
  total_tickers: number;
}

export interface UniverseStockItem {
  batch_id?: number;
  ticker: string;
  price: number;
  volume?: number;
  atr?: number;
  atr_pct?: number;
  rsi?: number;
  sma20?: number;
  sma50?: number;
  sector?: string;
}

/**
 * Service handling all historical batch and item operations for universe watchlists.
 * Strictly follows immutable time-series insert principles (no overwriting history).
 */
export class UniverseDbService {
  /**
   * Fetches the latest universe scan batch and all its associated stock items.
   */
  static async getLatestUniverse(): Promise<{ batch: UniverseScanBatch | null; items: UniverseStockItem[] }> {
    if (!process.env.DATABASE_URL) return { batch: null, items: [] };

    const client = await dbPool.connect();
    try {
      const batchRes = await client.query(`
        SELECT id, scanned_at, total_tickers
        FROM universe_scan_batches
        ORDER BY scanned_at DESC, id DESC
        LIMIT 1;
      `);

      if (batchRes.rows.length === 0) {
        return { batch: null, items: [] };
      }

      const batchRow = batchRes.rows[0];
      const batch: UniverseScanBatch = {
        id: batchRow.id,
        scanned_at: batchRow.scanned_at,
        total_tickers: batchRow.total_tickers,
      };

      const itemsRes = await client.query(`
        SELECT batch_id, ticker, price, volume, atr, atr_pct, rsi, sma20, sma50, sector
        FROM universe_watchlist_items
        WHERE batch_id = $1
        ORDER BY ticker ASC;
      `, [batch.id]);

      const items: UniverseStockItem[] = itemsRes.rows.map((row) => ({
        batch_id: row.batch_id,
        ticker: row.ticker,
        price: parseFloat(row.price),
        volume: row.volume ? parseInt(row.volume, 10) : undefined,
        atr: row.atr ? parseFloat(row.atr) : undefined,
        atr_pct: row.atr_pct ? parseFloat(row.atr_pct) : undefined,
        rsi: row.rsi ? parseFloat(row.rsi) : undefined,
        sma20: row.sma20 ? parseFloat(row.sma20) : undefined,
        sma50: row.sma50 ? parseFloat(row.sma50) : undefined,
        sector: row.sector || undefined,
      }));

      return { batch, items };
    } finally {
      client.release();
    }
  }

  /**
   * Records a brand new historical scan batch and all its stock items.
   * Every execution creates a new immutable batch and rows.
   */
  static async createScanBatchWithItems(stocks: UniverseStockItem[]): Promise<UniverseScanBatch> {
    if (stocks.length === 0) {
      throw new Error('The universe filter returned 0 stocks; no universe batch was created');
    }

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert parent batch record in Brisbane local time
      const batchRes = await client.query(`
        INSERT INTO universe_scan_batches (scanned_at, total_tickers)
        VALUES ((NOW() AT TIME ZONE 'Australia/Brisbane'), $1)
        RETURNING id, scanned_at, total_tickers;
      `, [stocks.length]);

      const batchRow = batchRes.rows[0];
      const newBatch: UniverseScanBatch = {
        id: batchRow.id,
        scanned_at: batchRow.scanned_at,
        total_tickers: batchRow.total_tickers,
      };

      // 2. Insert child items for this batch (time is tracked on parent batch)
      for (const stock of stocks) {
        await client.query(`
          INSERT INTO universe_watchlist_items (
            batch_id, ticker, price, volume, atr, atr_pct, rsi, sma20, sma50, sector
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `, [
          newBatch.id,
          stock.ticker,
          stock.price,
          stock.volume || null,
          stock.atr || null,
          stock.atr_pct || null,
          stock.rsi || null,
          stock.sma20 || null,
          stock.sma50 || null,
          stock.sector || null,
        ]);
      }

      await client.query('COMMIT');
      console.log(`[UniverseDbService] Created scan batch #${newBatch.id} with ${stocks.length} stock records.`);
      return newBatch;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[UniverseDbService] Error creating scan batch with items:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Returns list of all historical scan batches.
   */
  static async getAllScanBatches(): Promise<UniverseScanBatch[]> {
    if (!process.env.DATABASE_URL) return [];

    const client = await dbPool.connect();
    try {
      const res = await client.query(`
        SELECT id, scanned_at, total_tickers
        FROM universe_scan_batches
        ORDER BY scanned_at DESC, id DESC;
      `);
      return res.rows.map(r => ({
        id: r.id,
        scanned_at: r.scanned_at,
        total_tickers: r.total_tickers,
      }));
    } finally {
      client.release();
    }
  }
}

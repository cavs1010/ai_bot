import { dbPool } from '../db/pool';

export interface PositionDetail {
  ticker: string;
  shares: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  weight_pct?: number;
  sector?: string;
}

export interface PortfolioSnapshotRecord {
  id: number;
  snapshot_at: string;
  trigger_source: string;
  total_equity: number;
  cash: number;
  buying_power: number;
  day_pnl: number;
  day_pnl_pct: number;
  open_positions_count: number;
  positions_payload: PositionDetail[];
}

export interface CreatePortfolioSnapshotInput {
  trigger_source?: 'MANUAL_UPDATE' | 'PIPELINE_RUN' | 'RECONCILIATION';
  total_equity: number;
  cash: number;
  buying_power: number;
  day_pnl?: number;
  day_pnl_pct?: number;
  positions?: PositionDetail[];
}

export class PortfolioDbService {
  /**
   * Save a point-in-time portfolio snapshot to Neon Database with Brisbane local timestamp.
   */
  static async saveSnapshot(input: CreatePortfolioSnapshotInput): Promise<PortfolioSnapshotRecord> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set.');
    }

    const triggerSource = input.trigger_source || 'MANUAL_UPDATE';
    const dayPnl = input.day_pnl !== undefined ? input.day_pnl : 0.0;
    const dayPnlPct = input.day_pnl_pct !== undefined ? input.day_pnl_pct : 0.0;
    const positions = input.positions || [];
    const positionsCount = positions.length;
    const payloadJson = JSON.stringify(positions);

    const client = await dbPool.connect();
    try {
      // Option 1: Change-Detection Gatekeeper
      // Fetch the latest snapshot regardless of time to check if state has changed
      const latestRes = await client.query(`
        SELECT 
          id,
          snapshot_at,
          trigger_source,
          total_equity::numeric AS total_equity,
          cash::numeric AS cash,
          buying_power::numeric AS buying_power,
          day_pnl::numeric AS day_pnl,
          day_pnl_pct::numeric AS day_pnl_pct,
          open_positions_count,
          positions_payload
        FROM portfolio_snapshots
        ORDER BY snapshot_at DESC
        LIMIT 1;
      `);

      if (latestRes.rows.length > 0) {
        const latest = latestRes.rows[0];
        
        // Check numeric differences with standard cent tolerance ($0.01)
        const equityDiff = Math.abs(parseFloat(latest.total_equity) - input.total_equity);
        const cashDiff = Math.abs(parseFloat(latest.cash) - input.cash);
        const buyingPowerDiff = Math.abs(parseFloat(latest.buying_power) - input.buying_power);
        const positionsCountMatches = Number(latest.open_positions_count) === positionsCount;

        // Check if positions payload changed (compare JSON structure)
        const latestPayloadStr = JSON.stringify(latest.positions_payload || []);
        const newPayloadStr = JSON.stringify(positions);
        const positionsPayloadMatches = latestPayloadStr === newPayloadStr;

        const isUnchanged = equityDiff < 0.01 && 
                            cashDiff < 0.01 && 
                            buyingPowerDiff < 0.01 && 
                            positionsCountMatches && 
                            positionsPayloadMatches;

        if (isUnchanged) {
          console.log(`[Database] Change-Detection Gatekeeper: State unchanged (Equity: $${input.total_equity}, Cash: $${input.cash}, Positions: ${positionsCount}). Reusing existing snapshot #${latest.id}.`);
          return {
            id: latest.id,
            snapshot_at: latest.snapshot_at,
            trigger_source: latest.trigger_source,
            total_equity: parseFloat(latest.total_equity),
            cash: parseFloat(latest.cash),
            buying_power: parseFloat(latest.buying_power),
            day_pnl: parseFloat(latest.day_pnl),
            day_pnl_pct: parseFloat(latest.day_pnl_pct),
            open_positions_count: latest.open_positions_count,
            positions_payload: latest.positions_payload || [],
          };
        }
      }

      const res = await client.query(`
        INSERT INTO portfolio_snapshots (
          snapshot_at,
          trigger_source,
          total_equity,
          cash,
          buying_power,
          day_pnl,
          day_pnl_pct,
          open_positions_count,
          positions_payload
        ) VALUES (
          (NOW() AT TIME ZONE 'Australia/Brisbane'),
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb
        )
        RETURNING 
          id,
          snapshot_at,
          trigger_source,
          total_equity,
          cash,
          buying_power,
          day_pnl,
          day_pnl_pct,
          open_positions_count,
          positions_payload;
      `, [
        triggerSource,
        input.total_equity,
        input.cash,
        input.buying_power,
        dayPnl,
        dayPnlPct,
        positionsCount,
        payloadJson,
      ]);

      const row = res.rows[0];
      return {
        id: row.id,
        snapshot_at: row.snapshot_at,
        trigger_source: row.trigger_source,
        total_equity: parseFloat(row.total_equity),
        cash: parseFloat(row.cash),
        buying_power: parseFloat(row.buying_power),
        day_pnl: parseFloat(row.day_pnl),
        day_pnl_pct: parseFloat(row.day_pnl_pct),
        open_positions_count: row.open_positions_count,
        positions_payload: row.positions_payload || [],
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get the most recent portfolio snapshot recorded in Neon.
   */
  static async getLatestSnapshot(): Promise<PortfolioSnapshotRecord | null> {
    if (!process.env.DATABASE_URL) {
      return null;
    }

    const client = await dbPool.connect();
    try {
      const res = await client.query(`
        SELECT 
          id,
          snapshot_at,
          trigger_source,
          total_equity,
          cash,
          buying_power,
          day_pnl,
          day_pnl_pct,
          open_positions_count,
          positions_payload
        FROM portfolio_snapshots
        ORDER BY snapshot_at DESC
        LIMIT 1;
      `);

      if (res.rows.length === 0) {
        return null;
      }

      const row = res.rows[0];
      return {
        id: row.id,
        snapshot_at: row.snapshot_at,
        trigger_source: row.trigger_source,
        total_equity: parseFloat(row.total_equity),
        cash: parseFloat(row.cash),
        buying_power: parseFloat(row.buying_power),
        day_pnl: parseFloat(row.day_pnl),
        day_pnl_pct: parseFloat(row.day_pnl_pct),
        open_positions_count: row.open_positions_count,
        positions_payload: row.positions_payload || [],
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get historical snapshots from Neon Database.
   */
  static async getSnapshotHistory(limit: number = 30): Promise<PortfolioSnapshotRecord[]> {
    if (!process.env.DATABASE_URL) {
      return [];
    }

    const client = await dbPool.connect();
    try {
      const res = await client.query(`
        SELECT 
          id,
          snapshot_at,
          trigger_source,
          total_equity,
          cash,
          buying_power,
          day_pnl,
          day_pnl_pct,
          open_positions_count,
          positions_payload
        FROM portfolio_snapshots
        ORDER BY snapshot_at DESC
        LIMIT $1;
      `, [limit]);

      return res.rows.map(row => ({
        id: row.id,
        snapshot_at: row.snapshot_at,
        trigger_source: row.trigger_source,
        total_equity: parseFloat(row.total_equity),
        cash: parseFloat(row.cash),
        buying_power: parseFloat(row.buying_power),
        day_pnl: parseFloat(row.day_pnl),
        day_pnl_pct: parseFloat(row.day_pnl_pct),
        open_positions_count: row.open_positions_count,
        positions_payload: row.positions_payload || [],
      }));
    } finally {
      client.release();
    }
  }
}

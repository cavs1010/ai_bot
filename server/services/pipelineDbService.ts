import type { PoolClient } from 'pg';
import { dbPool } from '../db/pool';
import { PipelineRun } from '../db/schema';

export interface CreatePipelineRunInput {
  is_dry_run: boolean;
  config_id: number;
}

export interface CompletePipelineRunInput {
  status: 'SUCCESS' | 'FAILED';
  total_candidates: number;
  orders_generated: number;
  error_message: string | null;
}

export class PipelineDbService {
  /**
   * Inserts a new execution run record into pipeline_runs table upon trigger.
   * Uses exact live Neon PostgreSQL columns (id uuid, config_id, status, mode, total_candidates, orders_generated).
   */
  static async createRun(input: CreatePipelineRunInput): Promise<PipelineRun> {
    const mode = input.is_dry_run ? 'PAPER' : 'LIVE';
    const client = await dbPool.connect();
    try {
      const res = await client.query(
        `INSERT INTO pipeline_runs (
          config_id,
          status,
          mode,
          total_candidates,
          orders_generated
        ) VALUES (
          $1,
          'RUNNING',
          $2,
          0,
          0
        )
        RETURNING
          id,
          config_id,
          status,
          mode,
          total_candidates,
          orders_generated,
          error_message,
          started_at,
          completed_at;`,
        [
          input.config_id,
          mode,
        ]
      );

      const row = res.rows[0];
      console.log(`[PipelineDbService] Created pipeline_run #${row.id} [mode=${mode}] in Neon DB.`);
      return row;
    } finally {
      client.release();
    }
  }

  /**
   * Updates an existing pipeline_run record upon run completion or failure.
   */
  static async completeRun(id: string, input: CompletePipelineRunInput): Promise<PipelineRun> {
    const client = await dbPool.connect();
    try {
      const res = await client.query(
        `UPDATE pipeline_runs
         SET
           completed_at = CURRENT_TIMESTAMP AT TIME ZONE 'Australia/Brisbane',
           status = $1,
           total_candidates = $2,
           orders_generated = $3,
           error_message = $4
         WHERE id = $5
         RETURNING
           id,
           config_id,
           status,
           mode,
           total_candidates,
           orders_generated,
           error_message,
           started_at,
           completed_at;`,
        [
          input.status,
          input.total_candidates,
          input.orders_generated,
          input.error_message,
          id,
        ]
      );

      if (res.rows.length === 0) {
        throw new Error(`No pipeline_run found with id ${id} to complete`);
      }

      const row = res.rows[0];
      console.log(`[PipelineDbService] Completed pipeline_run #${row.id} [status=${input.status}] in Neon DB.`);
      return row;
    } finally {
      client.release();
    }
  }

  /**
   * Fetches recent pipeline execution runs history from Neon PostgreSQL.
   */
  static async getRecentRuns(limit: number = 30): Promise<PipelineRun[]> {
    if (!process.env.DATABASE_URL) return [];

    const client = await dbPool.connect();
    try {
      const res = await client.query(
        `SELECT
           id,
           config_id,
           status,
           mode,
           total_candidates,
           orders_generated,
           error_message,
           started_at,
           completed_at
         FROM pipeline_runs
         ORDER BY started_at DESC
         LIMIT $1;`,
        [limit]
      );

      return res.rows.map((row) => ({
        id: row.id,
        config_id: row.config_id,
        status: row.status,
        mode: row.mode,
        total_candidates: Number(row.total_candidates || 0),
        orders_generated: Number(row.orders_generated || 0),
        error_message: row.error_message,
        started_at: row.started_at,
        completed_at: row.completed_at,
      }));
    } catch (err) {
      console.error('[PipelineDbService] Error fetching recent pipeline runs:', err);
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Saves a finished run's results — scanned stocks, gate verdicts and orders — in one transaction:
   * either all three tables are written or none is.
   */
  static async saveRunResults(
    runId: string,
    batchId: number,
    stocks: Parameters<typeof PipelineDbService.saveScannedStocks>[3],
    evaluations: Parameters<typeof PipelineDbService.saveGateEvaluations>[2],
    orders: Parameters<typeof PipelineDbService.saveOrderExecutions>[2]
  ): Promise<void> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      await PipelineDbService.saveScannedStocks(client, runId, batchId, stocks);
      await PipelineDbService.saveGateEvaluations(client, runId, evaluations);
      await PipelineDbService.saveOrderExecutions(client, runId, orders);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk persists evaluated candidate stocks into scanned_stocks in a single atomic database query.
   * Uses composite primary key (run_id, ticker, batch_id) with Brisbane local timestamps.
   */
  static async saveScannedStocks(
    client: PoolClient, // the run-results transaction (saveRunResults)
    runId: string,
    batchId: number,
    stocks: Array<{
      ticker: string;
      final_decision: string;
      rule_evaluations: Record<string, any>;
    }>
  ): Promise<any[]> {
    // A run with no candidates has nothing to insert (an empty VALUES list is invalid SQL)
    if (stocks.length === 0) {
      return [];
    }

    try {
      const valuePlaceholders: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const stock of stocks) {
        const ticker = stock.ticker;
        const finalDecision = stock.final_decision;
        const ruleEvaluations = JSON.stringify(stock.rule_evaluations);

        valuePlaceholders.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, (CURRENT_TIMESTAMP AT TIME ZONE 'Australia/Brisbane'))`
        );

        values.push(
          runId,
          ticker,
          batchId,
          finalDecision,
          ruleEvaluations
        );
      }

      const query = `
        INSERT INTO scanned_stocks (
          run_id,
          ticker,
          batch_id,
          final_decision,
          rule_evaluations,
          created_at
        ) VALUES ${valuePlaceholders.join(', ')}
        ON CONFLICT (run_id, ticker, batch_id) DO UPDATE SET
          final_decision = EXCLUDED.final_decision,
          rule_evaluations = EXCLUDED.rule_evaluations
        RETURNING
          run_id,
          ticker,
          batch_id,
          final_decision,
          rule_evaluations,
          created_at;
      `;

      const res = await client.query(query, values);
      console.log(`[PipelineDbService] Bulk saved ${res.rows.length} candidates to scanned_stocks for run ${runId} [batch_id=${batchId}].`);
      return res.rows.map((r) => ({
        run_id: r.run_id,
        ticker: r.ticker,
        batch_id: r.batch_id,
        final_decision: r.final_decision,
        rule_evaluations: typeof r.rule_evaluations === 'string' ? JSON.parse(r.rule_evaluations) : r.rule_evaluations,
        created_at: r.created_at,
      }));
    } catch (err) {
      console.error(`[PipelineDbService] Error bulk saving scanned_stocks for run ${runId}:`, err);
      throw err;
    }
  }

  /**
   * Fetches all candidate stocks recorded for a specific pipeline execution run.
   */
  static async getScannedStocksForRun(runId: string): Promise<any[]> {
    if (!process.env.DATABASE_URL) return [];

    const client = await dbPool.connect();
    try {
      const res = await client.query(
        `SELECT
           run_id,
           ticker,
           batch_id,
           final_decision,
           rule_evaluations,
           created_at
         FROM scanned_stocks
         WHERE run_id = $1
         ORDER BY ticker ASC;`,
        [runId]
      );

      return res.rows.map((r) => ({
        run_id: r.run_id,
        ticker: r.ticker,
        batch_id: r.batch_id,
        final_decision: r.final_decision,
        rule_evaluations: typeof r.rule_evaluations === 'string' ? JSON.parse(r.rule_evaluations) : r.rule_evaluations,
        created_at: r.created_at,
      }));
    } catch (err) {
      console.error(`[PipelineDbService] Error fetching scanned_stocks for run ${runId}:`, err);
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Fetches all gate verdicts recorded for a specific pipeline run, in gate order per ticker.
   */
  static async getGateEvaluationsForRun(runId: string): Promise<any[]> {
    const res = await dbPool.query(
      `SELECT id, run_id, ticker, gate_id, passed, score, reasoning, sub_evaluations, created_at
       FROM gate_evaluations
       WHERE run_id = $1
       ORDER BY ticker ASC, gate_id ASC;`,
      [runId]
    );
    return res.rows.map((r) => ({
      ...r,
      score: r.score !== null ? parseFloat(r.score) : null,
    }));
  }

  /**
   * Bulk persists evaluated gate decisions into gate_evaluations in a single atomic database query.
   * Enforces Brisbane local timestamps (Australia/Brisbane, UTC+10).
   */
  static async saveGateEvaluations(
    client: PoolClient, // the run-results transaction (saveRunResults)
    runId: string,
    evaluations: Array<{
      ticker: string;
      gate_id: number;
      passed: boolean;
      score: number | null;
      reasoning: string | null;
      sub_evaluations: Record<string, any>;
    }>
  ): Promise<any[]> {
    // A run with no candidates has nothing to insert (an empty VALUES list is invalid SQL)
    if (evaluations.length === 0) {
      return [];
    }

    try {
      const valuePlaceholders: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const ev of evaluations) {
        const ticker = ev.ticker;
        const gateId = ev.gate_id;
        const passed = ev.passed;
        const score = ev.score;
        const reasoning = ev.reasoning;
        const subEvaluations = JSON.stringify(ev.sub_evaluations);

        valuePlaceholders.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, (CURRENT_TIMESTAMP AT TIME ZONE 'Australia/Brisbane'))`
        );

        values.push(
          runId,
          ticker,
          gateId,
          passed,
          score,
          reasoning,
          subEvaluations
        );
      }

      const query = `
        INSERT INTO gate_evaluations (
          run_id,
          ticker,
          gate_id,
          passed,
          score,
          reasoning,
          sub_evaluations,
          created_at
        ) VALUES ${valuePlaceholders.join(', ')}
        RETURNING
          id,
          run_id,
          ticker,
          gate_id,
          passed,
          score,
          reasoning,
          sub_evaluations,
          created_at;
      `;

      const res = await client.query(query, values);
      console.log(`[PipelineDbService] Bulk saved ${res.rows.length} gate evaluations for run ${runId}.`);
      return res.rows.map((r) => ({
        id: r.id,
        run_id: r.run_id,
        ticker: r.ticker,
        gate_id: Number(r.gate_id),
        passed: Boolean(r.passed),
        score: r.score !== null ? parseFloat(r.score) : null,
        reasoning: r.reasoning,
        sub_evaluations: typeof r.sub_evaluations === 'string' ? JSON.parse(r.sub_evaluations) : r.sub_evaluations,
        created_at: r.created_at,
      }));
    } catch (err) {
      console.error(`[PipelineDbService] Error bulk saving gate_evaluations for run ${runId}:`, err);
      throw err;
    }
  }

  /**
   * Bulk persists generated order tickets into order_executions in a single atomic database query.
   * Enforces Brisbane local timestamps (Australia/Brisbane, UTC+10).
   */
  static async saveOrderExecutions(
    client: PoolClient, // the run-results transaction (saveRunResults)
    runId: string,
    orders: Array<{
      symbol: string;
      client_order_id: string | null;
      alpaca_order_id: string | null;
      side: string;
      order_type: string;
      qty: number;
      stop_loss: number | null;
      filled_avg_price: number | null;
      filled_qty: number | null;
      status: string;
      raw_response: Record<string, any>;
    }>
  ): Promise<any[]> {
    // A run with no orders has nothing to insert (an empty VALUES list is invalid SQL)
    if (orders.length === 0) {
      return [];
    }

    try {
      const valuePlaceholders: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const order of orders) {
        valuePlaceholders.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, (CURRENT_TIMESTAMP AT TIME ZONE 'Australia/Brisbane'))`
        );

        values.push(
          runId,
          order.symbol,
          order.client_order_id,
          order.alpaca_order_id,
          order.side,
          order.order_type,
          order.qty,
          order.stop_loss,
          order.filled_avg_price,
          order.filled_qty,
          order.status,
          JSON.stringify(order.raw_response)
        );
      }

      // limit_price and take_profit stay empty: the executor places market orders with no take-profit order
      const query = `
        INSERT INTO order_executions (
          run_id,
          symbol,
          client_order_id,
          alpaca_order_id,
          side,
          order_type,
          qty,
          stop_loss,
          filled_avg_price,
          filled_qty,
          status,
          raw_response,
          created_at
        ) VALUES ${valuePlaceholders.join(', ')}
        RETURNING
          id,
          run_id,
          candidate_id,
          symbol,
          client_order_id,
          alpaca_order_id,
          side,
          order_type,
          qty,
          limit_price,
          stop_loss,
          take_profit,
          filled_avg_price,
          filled_qty,
          status,
          raw_response,
          created_at;
      `;

      const res = await client.query(query, values);
      console.log(`[PipelineDbService] Bulk saved ${res.rows.length} order executions for run ${runId}.`);
      return res.rows.map((r) => ({
        id: r.id,
        run_id: r.run_id,
        candidate_id: r.candidate_id ? Number(r.candidate_id) : null,
        symbol: r.symbol,
        client_order_id: r.client_order_id,
        alpaca_order_id: r.alpaca_order_id,
        side: r.side,
        order_type: r.order_type,
        qty: parseFloat(r.qty),
        limit_price: r.limit_price !== null ? parseFloat(r.limit_price) : null,
        stop_loss: r.stop_loss !== null ? parseFloat(r.stop_loss) : null,
        take_profit: r.take_profit !== null ? parseFloat(r.take_profit) : null,
        filled_avg_price: r.filled_avg_price !== null && r.filled_avg_price !== undefined ? parseFloat(r.filled_avg_price) : null,
        filled_qty: r.filled_qty !== null ? parseFloat(r.filled_qty) : null,
        status: r.status,
        raw_response: typeof r.raw_response === 'string' ? JSON.parse(r.raw_response) : r.raw_response,
        created_at: r.created_at,
      }));
    } catch (err) {
      console.error(`[PipelineDbService] Error bulk saving order_executions for run ${runId}:`, err);
      throw err;
    }
  }

  /**
   * Fetches all order execution records for a specific pipeline execution run.
   */
  static async getOrderExecutionsForRun(runId: string): Promise<any[]> {
    if (!process.env.DATABASE_URL) return [];

    const client = await dbPool.connect();
    try {
      const res = await client.query(
        `SELECT
           id,
           run_id,
           candidate_id,
           symbol,
           client_order_id,
           alpaca_order_id,
           side,
           order_type,
           qty,
           limit_price,
           stop_loss,
           take_profit,
           filled_avg_price,
           filled_qty,
           status,
           raw_response,
           created_at
         FROM order_executions
         WHERE run_id = $1
         ORDER BY id ASC;`,
        [runId]
      );

      return res.rows.map((r) => ({
        id: r.id,
        run_id: r.run_id,
        candidate_id: r.candidate_id ? Number(r.candidate_id) : null,
        symbol: r.symbol,
        client_order_id: r.client_order_id,
        alpaca_order_id: r.alpaca_order_id,
        side: r.side,
        order_type: r.order_type,
        qty: parseFloat(r.qty),
        limit_price: r.limit_price !== null ? parseFloat(r.limit_price) : null,
        stop_loss: r.stop_loss !== null ? parseFloat(r.stop_loss) : null,
        take_profit: r.take_profit !== null ? parseFloat(r.take_profit) : null,
        filled_avg_price: r.filled_avg_price !== null && r.filled_avg_price !== undefined ? parseFloat(r.filled_avg_price) : null,
        filled_qty: r.filled_qty !== null ? parseFloat(r.filled_qty) : null,
        status: r.status,
        raw_response: typeof r.raw_response === 'string' ? JSON.parse(r.raw_response) : r.raw_response,
        created_at: r.created_at,
      }));
    } catch (err) {
      console.error(`[PipelineDbService] Error fetching order_executions for run ${runId}:`, err);
      return [];
    } finally {
      client.release();
    }
  }
}


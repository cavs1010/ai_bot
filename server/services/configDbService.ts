import { dbPool } from '../db/pool';
import { PipelineConfig } from '../db/schema';

const CONFIG_COLUMNS = 'id, name, version, is_default, selection_params, money_params, created_at';

/**
 * Environment for a Python run: the strategy settings it must use, read by backend/config.py.
 */
export function toStrategyEnv(config: PipelineConfig): NodeJS.ProcessEnv {
  return {
    STRATEGY_CONFIG: JSON.stringify({
      selection_params: config.selection_params,
      money_params: config.money_params,
    }),
  };
}

export class ConfigDbService {
  /**
   * Save a strategy configuration profile into pipeline_configs table.
   * Auto-increments version if a configuration with the same name exists.
   * Neon enforces that both params objects contain every required section.
   */
  static async saveConfig(input: {
    name: string;
    is_default: boolean;
    selection_params: Record<string, any>;
    money_params: Record<string, any>;
  }): Promise<PipelineConfig> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // Only one row may be the default (index pipeline_configs_one_default)
      if (input.is_default) {
        await client.query(`UPDATE pipeline_configs SET is_default = false WHERE is_default = true`);
      }

      // Next version for this name is computed inside the insert
      const insertRes = await client.query(
        `INSERT INTO pipeline_configs (name, version, is_default, selection_params, money_params, created_at)
         SELECT $1::varchar, COALESCE(MAX(version), 0) + 1, $2, $3, $4, (NOW() AT TIME ZONE 'Australia/Brisbane')
         FROM pipeline_configs WHERE name = $1
         RETURNING ${CONFIG_COLUMNS}`,
        [
          input.name,
          input.is_default,
          JSON.stringify(input.selection_params),
          JSON.stringify(input.money_params),
        ]
      );

      await client.query('COMMIT');
      return insertRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch all saved configurations
   */
  static async getAllConfigs(): Promise<PipelineConfig[]> {
    const res = await dbPool.query(
      `SELECT ${CONFIG_COLUMNS}
       FROM pipeline_configs
       ORDER BY created_at DESC, id DESC`
    );
    return res.rows;
  }

  /**
   * Fetch the active (default) configuration. Exactly one row must be marked is_default.
   */
  static async getActiveConfig(): Promise<PipelineConfig> {
    const res = await dbPool.query(
      `SELECT ${CONFIG_COLUMNS}
       FROM pipeline_configs
       WHERE is_default = true`
    );
    if (res.rows.length === 0) {
      throw new Error('No active strategy configuration: no pipeline_configs row has is_default = true');
    }
    return res.rows[0];
  }

  /**
   * Delete a configuration by ID
   */
  static async deleteConfig(id: number): Promise<boolean> {
    const res = await dbPool.query(
      `DELETE FROM pipeline_configs WHERE id = $1 RETURNING id`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

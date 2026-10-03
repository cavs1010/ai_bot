import { dbPool } from '../db/pool';

export interface PipelineConfig {
  id?: number;
  name: string;
  version?: number;
  is_default?: boolean;
  parameters_json: Record<string, any>;
  created_at?: string;
}

export class ConfigDbService {
  /**
   * Save a strategy configuration profile into pipeline_configs table.
   * Auto-increments version if a configuration with the same name exists.
   */
  static async saveConfig(input: {
    name: string;
    is_default?: boolean;
    parameters_json: Record<string, any>;
  }): Promise<PipelineConfig> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }

    const client = await dbPool.connect();
    try {
      // Find latest version for this name
      const versionRes = await client.query(
        `SELECT MAX(version) as max_version FROM pipeline_configs WHERE name = $1`,
        [input.name.trim()]
      );
      const nextVersion = (versionRes.rows[0]?.max_version || 0) + 1;

      // If marked as default, unset other defaults
      if (input.is_default) {
        await client.query(`UPDATE pipeline_configs SET is_default = false WHERE is_default = true`);
      }

      const insertRes = await client.query(
        `INSERT INTO pipeline_configs (name, version, is_default, parameters_json, created_at)
         VALUES ($1, $2, $3, $4, (NOW() AT TIME ZONE 'Australia/Brisbane'))
         RETURNING id, name, version, is_default, parameters_json, created_at`,
        [
          input.name.trim(),
          nextVersion,
          input.is_default ?? false,
          JSON.stringify(input.parameters_json),
        ]
      );

      const row = insertRes.rows[0];
      return {
        id: row.id,
        name: row.name,
        version: row.version,
        is_default: row.is_default,
        parameters_json: typeof row.parameters_json === 'string' ? JSON.parse(row.parameters_json) : row.parameters_json,
        created_at: row.created_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Fetch all saved configurations
   */
  static async getAllConfigs(): Promise<PipelineConfig[]> {
    if (!process.env.DATABASE_URL) return [];

    const client = await dbPool.connect();
    try {
      const res = await client.query(
        `SELECT id, name, version, is_default, parameters_json, created_at
         FROM pipeline_configs
         ORDER BY created_at DESC, id DESC`
      );

      return res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        version: row.version,
        is_default: row.is_default,
        parameters_json: typeof row.parameters_json === 'string' ? JSON.parse(row.parameters_json) : row.parameters_json,
        created_at: row.created_at,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Fetch latest or default active configuration
   */
  static async getActiveConfig(): Promise<PipelineConfig | null> {
    if (!process.env.DATABASE_URL) return null;

    const client = await dbPool.connect();
    try {
      const res = await client.query(
        `SELECT id, name, version, is_default, parameters_json, created_at
         FROM pipeline_configs
         WHERE is_default = true
         ORDER BY created_at DESC
         LIMIT 1`
      );

      if (res.rows.length === 0) {
        // Fallback to most recent configuration
        const latestRes = await client.query(
          `SELECT id, name, version, is_default, parameters_json, created_at
           FROM pipeline_configs
           ORDER BY created_at DESC
           LIMIT 1`
        );
        if (latestRes.rows.length === 0) return null;
        const row = latestRes.rows[0];
        return {
          id: row.id,
          name: row.name,
          version: row.version,
          is_default: row.is_default,
          parameters_json: typeof row.parameters_json === 'string' ? JSON.parse(row.parameters_json) : row.parameters_json,
          created_at: row.created_at,
        };
      }

      const row = res.rows[0];
      return {
        id: row.id,
        name: row.name,
        version: row.version,
        is_default: row.is_default,
        parameters_json: typeof row.parameters_json === 'string' ? JSON.parse(row.parameters_json) : row.parameters_json,
        created_at: row.created_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Delete a configuration by ID
   */
  static async deleteConfig(id: number): Promise<boolean> {
    if (!process.env.DATABASE_URL) return false;

    const client = await dbPool.connect();
    try {
      const res = await client.query(
        `DELETE FROM pipeline_configs WHERE id = $1 RETURNING id`,
        [id]
      );
      return (res.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import { PATHS } from './server/config/paths';
import { universeRouter } from './server/routes/universeRoutes';
import { pipelineRouter } from './server/routes/pipelineRoutes';
import { portfolioRouter } from './server/routes/portfolioRoutes';
import { configRouter } from './server/routes/configRoutes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard middleware
  app.use(cors());
  app.use(express.json());

  // Mount Clean Domain Routers
  app.use('/api/universe', universeRouter);
  app.use('/api/pipeline', pipelineRouter);
  app.use('/api/configs', configRouter);
  app.use('/api/portfolio', portfolioRouter);

  // Backward compatibility aliases
  app.use('/api/run', pipelineRouter);
  app.use('/api', configRouter);

  // DB schema full introspection endpoint
  app.get('/api/db/schema', async (req, res) => {
    try {
      const { dbPool } = await import('./server/db/pool');
      const tableQuery = await dbPool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
      );
      const tables = tableQuery.rows.map((r: any) => r.table_name);

      const colQuery = await dbPool.query(`
        SELECT 
          table_name, 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          ordinal_position
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        ORDER BY table_name, ordinal_position;
      `);

      const schemaByTable: Record<string, any[]> = {};
      for (const t of tables) {
        schemaByTable[t] = [];
      }
      for (const col of colQuery.rows) {
        if (!schemaByTable[col.table_name]) {
          schemaByTable[col.table_name] = [];
        }
        schemaByTable[col.table_name].push({
          column_name: col.column_name,
          data_type: col.data_type,
          is_nullable: col.is_nullable,
          column_default: col.column_default,
        });
      }

      // Write actual introspected schema to file
      try {
        const fs = await import('fs');
        fs.writeFileSync(
          path.resolve(process.cwd(), 'server/db/actual_neon_schema.json'),
          JSON.stringify({ tables, schema: schemaByTable }, null, 2),
          'utf-8'
        );
      } catch (e) {
        console.error('Failed to write actual_neon_schema.json:', e);
      }

      res.json({
        success: true,
        tables,
        schema: schemaByTable,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Health check & DB schema inspection endpoint
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    let tables: string[] = [];
    try {
      const { dbPool } = await import('./server/db/pool');
      const dbRes = await dbPool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
      tables = dbRes.rows.map((r: any) => r.table_name);
      dbStatus = 'connected';
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        tables,
      },
    });
  });

  // Run schema introspection on startup to mirror exact Neon DB reality
  try {
    const { dbPool } = await import('./server/db/pool');
    const tableQuery = await dbPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    const tables = tableQuery.rows.map((r: any) => r.table_name);

    const colQuery = await dbPool.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `);

    const schemaByTable: Record<string, any[]> = {};
    for (const t of tables) {
      schemaByTable[t] = [];
    }
    for (const col of colQuery.rows) {
      if (!schemaByTable[col.table_name]) {
        schemaByTable[col.table_name] = [];
      }
      schemaByTable[col.table_name].push({
        column_name: col.column_name,
        data_type: col.data_type,
        is_nullable: col.is_nullable,
        column_default: col.column_default,
      });
    }

    const fs = await import('fs');
    fs.writeFileSync(
      path.resolve(process.cwd(), 'server/db/actual_neon_schema.json'),
      JSON.stringify({ tables, schema: schemaByTable }, null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      path.resolve(process.cwd(), 'server/db/db_status.json'),
      JSON.stringify({ status: 'connected', tablesCount: tables.length, tables }, null, 2),
      'utf-8'
    );
    console.log(`[Neon DB Introspection] Successfully discovered ${tables.length} tables in live Neon DB:`, tables);
  } catch (err: any) {
    const fs = await import('fs');
    fs.writeFileSync(
      path.resolve(process.cwd(), 'server/db/db_status.json'),
      JSON.stringify({ status: 'error', error: err.message, hasDatabaseUrl: Boolean(process.env.DATABASE_URL) }, null, 2),
      'utf-8'
    );
    console.warn('[Neon DB Introspection] Could not introspect database on startup:', err.message);
  }

  // Catch-all JSON 404 handler for any unhandled /api routes (prevents falling through to SPA HTML)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Handle Frontend Serving (Vite in Dev, Pre-compiled Static in Prod)
  if (process.env.NODE_ENV === 'production') {
    const distPath = PATHS.dist;
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const frontendDir = path.resolve(process.cwd(), 'frontend');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(frontendDir, 'vite.config.ts'),
      root: frontendDir,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Trading Bot Server] Running on http://0.0.0.0:${PORT} (ENV: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[Trading Bot Server] Fatal error during startup:', err);
  process.exit(1);
});

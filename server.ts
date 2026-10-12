import 'dotenv/config';
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
  const PORT = process.env.PORT === undefined ? 3000 : Number(process.env.PORT);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  // Standard middleware
  app.use(cors());
  app.use(express.json());

  // Mount Clean Domain Routers
  app.use('/api/universe', universeRouter);
  app.use('/api/pipeline', pipelineRouter);
  app.use('/api/configs', configRouter);
  app.use('/api/portfolio', portfolioRouter);

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

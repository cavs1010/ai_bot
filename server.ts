import express from 'express';
import cors from 'cors';
import path from 'path';
import { PATHS } from './server/config/paths';
import { scannerRouter } from './server/routes/scannerRoutes';
import { portfolioRouter } from './server/routes/portfolioRoutes';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Standard middleware
  app.use(cors());
  app.use(express.json());

  // Mount API Domain Routers
  app.use('/api', scannerRouter);
  app.use('/api/portfolio', portfolioRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
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

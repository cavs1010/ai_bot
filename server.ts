import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

const rootDir = process.cwd();

// Path to store latest pipeline telemetry run on disk
const LATEST_RUN_PATH = path.join(rootDir, 'backend', '01_scanner', 'data', 'latest_run.json');

// Memory cache in case file read/write fails
let latestTelemetryCache: any = null;
let isPipelineRunning = false;

// Resolve Python executable to virtualenv python3 first, fallback to system python3
const getPythonExecutable = () => {
  const venvPython = path.join(rootDir, '.venv', 'bin', 'python3');
  return fs.existsSync(venvPython) ? venvPython : 'python3';
};

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // API routes first
  // Endpoint to fetch live portfolio metrics directly from Alpaca
  app.get('/api/portfolio/live', (req, res) => {
    const pythonScript = path.join(rootDir, 'backend', '04_execution', 'get_live_portfolio.py');
    const pythonBin = getPythonExecutable();
    const pythonProcess = spawn(pythonBin, [pythonScript]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        const json = JSON.parse(stdoutData.trim());
        if (json.success) {
          res.json(json);
        } else {
          res.status(500).json({ success: false, error: json.error || stderrData || "Failed to fetch Alpaca portfolio" });
        }
      } catch (err: any) {
        res.status(500).json({ success: false, error: `Invalid JSON response from portfolio script: ${err.message}`, details: stdoutData || stderrData });
      }
    });
  });

  const handleGetLatestTelemetry = (req: express.Request, res: express.Response) => {
    try {
      if (fs.existsSync(LATEST_RUN_PATH)) {
        const fileContent = fs.readFileSync(LATEST_RUN_PATH, 'utf-8');
        const data = JSON.parse(fileContent);
        res.json(data);
      } else if (latestTelemetryCache) {
        res.json(latestTelemetryCache);
      } else {
        res.status(404).json({ error: "No telemetry data has been generated yet." });
      }
    } catch (error: any) {
      console.error("Error reading latest run telemetry:", error);
      res.status(500).json({ error: "Failed to read telemetry data.", details: error.message });
    }
  };

  // Health check endpoint for Dokploy / container orchestration
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.get('/api/run/latest', handleGetLatestTelemetry);
  app.get('/api/pipeline/last-run', handleGetLatestTelemetry);

  // Server-Sent Events (SSE) route to replay cached/simulated telemetry at 0 token cost
  const handleReplaySSE = async (req: express.Request, res: express.Response) => {
    if (isPipelineRunning) {
      res.status(429).json({ error: "Another pipeline run is currently in progress." });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendSSE = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    let telemetryData: any = null;
    try {
      if (fs.existsSync(LATEST_RUN_PATH)) {
        telemetryData = JSON.parse(fs.readFileSync(LATEST_RUN_PATH, 'utf-8'));
      } else if (latestTelemetryCache) {
        telemetryData = latestTelemetryCache;
      }
    } catch (e) {
      console.warn("Could not load latest_run.json for replay, using fallback:", e);
    }

    if (!telemetryData) {
      telemetryData = {
        timestamp: new Date().toISOString(),
        portfolio: {
          value: 100000.0,
          daily_pnl: 1250.0,
          daily_pnl_pct: 1.25,
          open_positions: 2,
          max_positions: 10,
          drawdown_pct: 1.5,
          vix_level: 14.5,
          spy_change_pct: 0.45,
          hours_to_next_macro: 4.5
        },
        funnel: {
          universe_count: 62,
          scanned_count: 15,
          processed_count: 6,
          gate5_buy_count: 2,
          approved_count: 2,
          placed_count: 0
        },
        results: [
          {
            ticker: "NVDA",
            final_decision: "BUY",
            g3_direction: "BULLISH",
            g3_confidence: 9,
            ev: 0.084,
            win_prob: 0.58,
            position_confidence: "HIGH",
            trade_levels: { entry: 128.5, stop: 123.0, target: 139.5, reward_risk: 2.0 },
            risk_sizing: { shares: 35, position_value: 4497.5, position_pct: 4.5 },
            notes: "Passed all gates: strong semiconductor catalyst, EV: 8.4%, high AI confidence"
          },
          {
            ticker: "MSFT",
            final_decision: "BUY",
            g3_direction: "BULLISH",
            g3_confidence: 8,
            ev: 0.065,
            win_prob: 0.52,
            position_confidence: "HIGH",
            trade_levels: { entry: 420.0, stop: 411.5, target: 437.0, reward_risk: 2.0 },
            risk_sizing: { shares: 12, position_value: 5040.0, position_pct: 5.04 },
            notes: "Cloud & AI momentum confirmed; passed Gate 4 sentiment convergence; sizing approved"
          },
          {
            ticker: "AAPL",
            final_decision: "BLOCKED_G2",
            notes: "Gate 2 news block: Negative litigation headlines detected within past 24 hours"
          },
          {
            ticker: "TSLA",
            final_decision: "BLOCKED_G1:premarket_gap",
            notes: "Gate 1 rule block: Premarket gap beyond standard hard limits"
          },
          {
            ticker: "AMD",
            final_decision: "BLOCKED_G3",
            g3_direction: "NEUTRAL",
            g3_confidence: 4,
            notes: "Gate 3 AI sentiment block: Neutral direction with low confidence score (4/10)"
          },
          {
            ticker: "COF",
            final_decision: "SKIP",
            ev: 0.018,
            win_prob: 0.41,
            notes: "Gate 5 edge skip: Expected value (1.8%) below 4.0% minimum threshold"
          }
        ]
      };
    }

    sendSSE({ log: "⚡ [FAST REPLAY MODE] Initiating zero-cost simulated pipeline run ($0 Tokens)..." });
    await new Promise(r => setTimeout(r, 180));

    sendSSE({ log: `[portfolio] Using simulated sandbox portfolio limits ($${telemetryData.portfolio.value.toLocaleString()} account).` });
    await new Promise(r => setTimeout(r, 180));

    sendSSE({ log: `[gate1] Fetching market-wide shared indexes (SPY ${telemetryData.portfolio.spy_change_pct >= 0 ? '+' : ''}${telemetryData.portfolio.spy_change_pct}%, VIX ${telemetryData.portfolio.vix_level}, Macro Hours ${telemetryData.portfolio.hours_to_next_macro})...` });
    await new Promise(r => setTimeout(r, 200));

    const results = telemetryData.results || [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      sendSSE({ log: `[pipeline] processing candidate ${i + 1}: ${r.ticker}` });
      sendSSE({
        candidate: {
          ticker: r.ticker,
          final_decision: "EVALUATING...",
          g3_direction: null,
          g3_confidence: null,
          ev: null,
          win_prob: null,
          position_confidence: null,
          trade_levels: null,
          risk_sizing: null,
          risk_reject_reason: null,
          notes: `Processing candidate ${i + 1}: ${r.ticker}`
        }
      });
      await new Promise(res => setTimeout(res, 180));

      if (r.final_decision.startsWith('BLOCKED_G1')) {
        sendSSE({ log: `[gate1] ${r.ticker}: BLOCKED — ${r.notes || 'Hard limit triggered'}` });
        sendSSE({
          candidate: {
            ticker: r.ticker,
            final_decision: r.final_decision,
            notes: r.notes || "Gate 1 rule block"
          }
        });
      } else {
        sendSSE({ log: `[gate1] ${r.ticker}: passed all 8 checks` });
        sendSSE({
          candidate: {
            ticker: r.ticker,
            final_decision: "PASSED_G1",
            notes: "Gate 1 passed"
          }
        });
        await new Promise(res => setTimeout(res, 140));

        if (r.final_decision === 'BLOCKED_G2') {
          sendSSE({ log: `[gate2] ${r.ticker}: BLOCKED — catastrophic news event flagged` });
          sendSSE({
            candidate: {
              ticker: r.ticker,
              final_decision: "BLOCKED_G2",
              notes: r.notes || "Gate 2 news safety block"
            }
          });
        } else {
          sendSSE({ log: `[gate2] ${r.ticker}: Passed news safety checks.` });
          sendSSE({
            candidate: {
              ticker: r.ticker,
              final_decision: "PASSED_G2",
              notes: "Gate 2 passed"
            }
          });
          await new Promise(res => setTimeout(res, 140));

          if (r.final_decision === 'BLOCKED_G3') {
            sendSSE({ log: `[gate3] ${r.ticker}: BLOCKED — Sentiment direction is NEUTRAL/BEARISH or confidence low (${r.g3_confidence || 4}/10)` });
            sendSSE({
              candidate: {
                ticker: r.ticker,
                final_decision: "BLOCKED_G3",
                g3_direction: r.g3_direction || 'NEUTRAL',
                g3_confidence: r.g3_confidence || 4,
                notes: r.notes || "Gate 3 AI sentiment block"
              }
            });
          } else {
            sendSSE({ log: `[gate3] ${r.ticker}: Passed. AI Sentiment: ${r.g3_direction || 'BULLISH'} (Confidence: ${r.g3_confidence || 8}/10)` });
            sendSSE({
              candidate: {
                ticker: r.ticker,
                final_decision: "PASSED_G3",
                g3_direction: r.g3_direction || 'BULLISH',
                g3_confidence: r.g3_confidence || 8,
                notes: `Gate 3 passed (${r.g3_direction || 'BULLISH'}, ${r.g3_confidence || 8}/10)`
              }
            });
            await new Promise(res => setTimeout(res, 140));

            if (r.final_decision === 'BUY' || r.final_decision.startsWith('PLACED') || r.final_decision.startsWith('QUEUED')) {
              sendSSE({ log: `[gate5] ${r.ticker}: BUY — EV ${r.ev || 0.08} | win_prob=${Math.round((r.win_prob || 0.55) * 100)}%` });
              sendSSE({
                candidate: {
                  ticker: r.ticker,
                  final_decision: "BUY",
                  ev: r.ev,
                  win_prob: r.win_prob,
                  position_confidence: r.position_confidence || "HIGH",
                  trade_levels: r.trade_levels,
                  notes: "Gate 5 BUY Signal"
                }
              });
              await new Promise(res => setTimeout(res, 140));

              if (r.risk_sizing) {
                sendSSE({ log: `[risk] ${r.ticker}: APPROVED — ${r.risk_sizing.shares} shares ($${r.risk_sizing.position_value?.toLocaleString()}, ${r.risk_sizing.position_pct}% of portfolio)` });
                sendSSE({
                  candidate: {
                    ticker: r.ticker,
                    risk_sizing: r.risk_sizing,
                    notes: "Risk sizing approved"
                  }
                });
                await new Promise(res => setTimeout(res, 140));
              }

              if (r.final_decision.startsWith('PLACED')) {
                sendSSE({ log: `[executor] ${r.ticker}: Order filled successfully! Decision: ${r.final_decision}` });
                sendSSE({
                  candidate: {
                    ticker: r.ticker,
                    final_decision: r.final_decision,
                    notes: "Order filled on Alpaca"
                  }
                });
              } else if (r.final_decision.startsWith('QUEUED')) {
                sendSSE({ log: `[executor] ${r.ticker}: Order accepted & queued for market open! Decision: ${r.final_decision}` });
                sendSSE({
                  candidate: {
                    ticker: r.ticker,
                    final_decision: r.final_decision,
                    notes: "Order queued for market open"
                  }
                });
              }
            } else if (r.final_decision === 'SKIP') {
              sendSSE({ log: `[gate5] ${r.ticker}: SKIP — ${r.notes}` });
              sendSSE({
                candidate: {
                  ticker: r.ticker,
                  final_decision: "SKIP",
                  ev: r.ev,
                  win_prob: r.win_prob,
                  position_confidence: r.position_confidence || "LOW",
                  trade_levels: r.trade_levels,
                  notes: r.notes || "Gate 5 EV hurdle skip"
                }
              });
            }
          }
        }
      }
      await new Promise(res => setTimeout(res, 150));
    }

    sendSSE({ log: `[pipeline] Run completed. Processed ${results.length} candidates.` });
    telemetryData.timestamp = new Date().toISOString();
    sendSSE({ result: telemetryData });
    sendSSE({ log: "=== BOT PIPELINE REPLAY COMPLETED (0 TOKENS USED) ===" });
    sendSSE({ done: true });
    res.end();
  };

  app.get('/api/pipeline/replay', handleReplaySSE);
  app.get('/api/run/replay', handleReplaySSE);

  // Endpoint to run universe_filter.py and generate universe.json
  const handleUniverseGenerate = (req: express.Request, res: express.Response) => {
    const pythonScript = path.join(__dirname, 'backend', '01_scanner', 'universe_filter.py');
    const pythonBin = getPythonExecutable();
    const pythonProcess = spawn(pythonBin, [pythonScript]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          success: false,
          error: `Process exited with code ${code}`,
          details: stderrData
        });
      }

      const universeJsonPath = path.join(__dirname, 'backend', '01_scanner', 'data', 'universe.json');
      try {
        if (fs.existsSync(universeJsonPath)) {
          const fileContent = fs.readFileSync(universeJsonPath, 'utf-8');
          const tickersData = JSON.parse(fileContent);
          const tickers = tickersData.map((item: any) => item.ticker || item.name);
          res.json({
            success: true,
            count: tickersData.length,
            tickers: tickers,
            data: tickersData
          });
        } else {
          res.status(500).json({
            success: false,
            error: 'universe.json not found after script execution.'
          });
        }
      } catch (err: any) {
        res.status(500).json({
          success: false,
          error: `Failed to parse universe.json: ${err.message}`
        });
      }
    });
  };

  app.get('/api/universe/generate', handleUniverseGenerate);
  app.post('/api/universe/generate', handleUniverseGenerate);

  // Endpoint to directly fetch universe.json content
  app.get('/api/universe', (req, res) => {
    const universeJsonPath = path.join(__dirname, 'backend', '01_scanner', 'data', 'universe.json');
    try {
      if (fs.existsSync(universeJsonPath)) {
        const fileContent = fs.readFileSync(universeJsonPath, 'utf-8');
        const data = JSON.parse(fileContent);
        res.json({
          success: true,
          count: Array.isArray(data) ? data.length : 0,
          data: data
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'universe.json not found on disk. Click "Load Watchlist" to generate it.'
        });
      }
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: `Failed to read universe.json: ${err.message}`
      });
    }
  });

  // Server-Sent Events (SSE) route to trigger python pipeline and stream live console logs
  app.get('/api/run/trigger', (req, res) => {
    if (isPipelineRunning) {
      res.status(429).json({ error: "Another pipeline run is currently in progress." });
      return;
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    isPipelineRunning = true;

    // Send initial log message to client
    const sendSSE = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendSSE({ log: "🚀 Initiating live stock trading bot pipeline run..." });

    // Read optional configuration flags from query params
    const args: string[] = ['backend/run_pipeline_full.py'];
    
    // Parse query options
    if (req.query.runUniverse === 'true') {
      args.push('--run-universe');
      sendSSE({ log: "⚙️ Flag set: Force rebuilding of watchlist.csv" });
    }
    if (req.query.placeOrders === 'true') {
      args.push('--place-orders');
      sendSSE({ log: "⚙️ Flag set: Real Alpaca paper order execution enabled (Caution!)" });
    }
    if (req.query.ignoreMarketHours === 'true') {
      args.push('--ignore-market-hours');
      sendSSE({ log: "⚙️ Flag set: Force closed market orders enabled (Orders submitted even when market clock is closed)" });
    }
    if (req.query.livePortfolio === 'true' || req.query.livePortfolio === undefined) {
      args.push('--live-portfolio');
      sendSSE({ log: "⚙️ Flag set: Fetching live portfolio metrics from Alpaca API" });
    }

    const pythonBin = getPythonExecutable();
    sendSSE({ log: `📂 Executing: ${pythonBin} ${args.join(' ')}` });

    // Spawn Python process
    const pythonProcess = spawn(pythonBin, args);

    let jsonBuffer = "";
    let isCapturingJson = false;

    // Buffer chunk lines correctly
    let stdoutBuffer = "";
    pythonProcess.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      // Keep the last partial line in the buffer
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed === "__JSON_OUTPUT_START__") {
          isCapturingJson = true;
          continue;
        }
        if (trimmed === "__JSON_OUTPUT_END__") {
          isCapturingJson = false;
          try {
            const telemetry = JSON.parse(jsonBuffer);
            latestTelemetryCache = telemetry;
            
            // Save to file on disk asynchronously
            const dataDir = path.dirname(LATEST_RUN_PATH);
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(LATEST_RUN_PATH, JSON.stringify(telemetry, null, 2));
            
            // Send telemetry payload to client
            sendSSE({ result: telemetry });
          } catch (e: any) {
            sendSSE({ log: `❌ Error parsing pipeline JSON output: ${e.message}` });
          }
          continue;
        }

        if (isCapturingJson) {
          jsonBuffer += line + "\n";
        } else if (trimmed.startsWith("__CANDIDATE_UPDATE__ ")) {
          try {
            const candidateData = JSON.parse(trimmed.slice("__CANDIDATE_UPDATE__ ".length));
            sendSSE({ candidate: candidateData });
          } catch (e: any) {
            console.warn("Could not parse candidate update line:", trimmed, e);
          }
        } else {
          // Send normal log lines to client
          sendSSE({ log: line });
        }
      }
    });

    let stderrBuffer = '';
    pythonProcess.stderr.on('data', (chunk) => {
      const chunkStr = chunk.toString();
      stderrBuffer += chunkStr;
      const errorLines = chunkStr.split('\n');
      for (const line of errorLines) {
        if (line.trim()) {
          sendSSE({ log: `⚠️ [stderr] ${line}` });
        }
      }
    });

    pythonProcess.on('error', (err) => {
      sendSSE({ log: `❌ Process Spawn Error: ${err.message}` });
      sendSSE({ error: `Process Spawn Error: ${err.message}` });
    });

    pythonProcess.on('close', (code) => {
      isPipelineRunning = false;
      sendSSE({ log: `🏁 Python process exited with code ${code}` });
      if (code !== 0 && !isCapturingJson) {
        const cleanStderr = stderrBuffer.trim() || `Python process crashed with exit code ${code}`;
        sendSSE({ error: cleanStderr });
      }
      sendSSE({ done: true });
      res.end();
    });

    // Handle client disconnects gracefully
    req.on('close', () => {
      if (isPipelineRunning) {
        console.log("Client disconnected from SSE stream, killing Python child process...");
        pythonProcess.kill();
        isPipelineRunning = false;
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: 'frontend/vite.config.ts',
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();

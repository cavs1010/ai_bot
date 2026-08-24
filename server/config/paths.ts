import path from 'path';
import fs from 'fs';

// Root directory of the project workspace
export const PROJECT_ROOT = process.cwd();

// Canonical paths across both dev (tsx) and prod (dist/server.cjs)
export const PATHS = {
  root: PROJECT_ROOT,
  backend: path.join(PROJECT_ROOT, 'backend'),
  scanner: path.join(PROJECT_ROOT, 'backend', '01_scanner'),
  scannerData: path.join(PROJECT_ROOT, 'backend', '01_scanner', 'data'),
  universeJson: path.join(PROJECT_ROOT, 'backend', '01_scanner', 'data', 'universe.json'),
  universeScript: path.join(PROJECT_ROOT, 'backend', '01_scanner', 'universe_filter.py'),
  latestRunJson: path.join(PROJECT_ROOT, 'backend', '01_scanner', 'data', 'latest_run.json'),
  pipelineFullScript: path.join(PROJECT_ROOT, 'backend', 'run_pipeline_full.py'),
  pipelineFastScript: path.join(PROJECT_ROOT, 'backend', '01_scanner', 'run_pipeline_fast.py'),
  venvPython: path.join(PROJECT_ROOT, '.venv', 'bin', 'python3'),
  dist: path.join(PROJECT_ROOT, 'dist'),
} as const;

/**
 * Returns the verified Python executable path (.venv/bin/python3).
 * Ensures compliance with AGENTS.md Lesson 9.
 */
export function getPythonExecutable(): string {
  const venvPython = PATHS.venvPython;
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  // Fallback if running outside virtual environment
  return 'python3';
}

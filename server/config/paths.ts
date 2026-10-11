import path from 'path';
import fs from 'fs';

// Root directory of the project workspace
export const PROJECT_ROOT = process.cwd();

// Canonical paths across both dev (tsx) and prod (dist/server.cjs)
export const PATHS = {
  root: PROJECT_ROOT,
  backend: path.join(PROJECT_ROOT, 'backend'),
  scanner: path.join(PROJECT_ROOT, 'backend', 'scanner'),
  universeScript: path.join(PROJECT_ROOT, 'backend', 'scanner', 'universe.py'),
  latestRunJson: path.join(PROJECT_ROOT, 'backend', 'scanner', 'data', 'latest_run.json'),
  pipelineFullScript: path.join(PROJECT_ROOT, 'backend', 'cli.py'),
  dist: path.join(PROJECT_ROOT, 'dist'),
} as const;

/**
 * Returns the project venv Python executable.
 * Local README uses `venv/`; Docker production uses `.venv/`.
 * Never falls back to system python (AGENTS.md Rule 9).
 */
export function getPythonExecutable(): string {
  const candidates =
    process.platform === 'win32'
      ? [
          path.join(PROJECT_ROOT, 'venv', 'Scripts', 'python.exe'),
          path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe'),
        ]
      : [
          path.join(PROJECT_ROOT, '.venv', 'bin', 'python3'),
          path.join(PROJECT_ROOT, 'venv', 'bin', 'python3'),
        ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Project venv Python not found. Checked:\n${candidates.join('\n')}`
  );
}

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { getPythonExecutable, PATHS } from '../config/paths';

export interface PythonExecutionOptions {
  scriptPath: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdin?: string; // data handed to the script on stdin (e.g. the universe rows), then closed
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface PythonExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
}

export class PythonRunner {
  /**
   * Spawns a Python script using the centralized .venv runtime
   */
  static spawnProcess(options: PythonExecutionOptions): ChildProcessWithoutNullStreams {
    const pythonExe = getPythonExecutable();
    const args = [options.scriptPath, ...(options.args || [])];

    const extraPythonPath = [
      '/usr/local/lib/python3.10/dist-packages',
      '/root/.local/lib/python3.10/site-packages',
      PATHS.root,
      PATHS.backend,
      process.env.PYTHONPATH || '',
    ].filter(Boolean).join(':');

    const child = spawn(pythonExe, args, {
      cwd: options.cwd || PATHS.root,
      env: {
        ...process.env,
        PYTHONPATH: extraPythonPath,
        PYTHONUNBUFFERED: '1',
        ...(options.env || {}),
      },
    });

    if (options.stdin !== undefined) {
      child.stdin.end(options.stdin);
    }

    if (options.onStdout) {
      child.stdout.on('data', (data) => options.onStdout!(data.toString()));
    }

    if (options.onStderr) {
      child.stderr.on('data', (data) => options.onStderr!(data.toString()));
    }

    return child;
  }

  /**
   * Executes a Python script asynchronously to completion
   */
  static async runToCompletion(options: PythonExecutionOptions): Promise<PythonExecutionResult> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const child = this.spawnProcess({
        ...options,
        onStdout: (data) => {
          stdout += data;
          if (options.onStdout) options.onStdout(data);
        },
        onStderr: (data) => {
          stderr += data;
          if (options.onStderr) options.onStderr(data);
        },
      });

      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        resolve({
          code: code ?? 0,
          stdout,
          stderr,
        });
      });
    });
  }
}

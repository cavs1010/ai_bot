import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { getPythonExecutable, PATHS } from '../config/paths';

export interface PythonExecutionOptions {
  scriptPath: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
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

    const child = spawn(pythonExe, args, {
      cwd: options.cwd || PATHS.root,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        ...(options.env || {}),
      },
    });

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

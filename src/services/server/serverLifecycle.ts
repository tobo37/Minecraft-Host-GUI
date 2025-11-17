/**
 * Server lifecycle management (start/stop)
 */

import type { ServerProcess } from './server.types';
import { readMetadata } from '../metadataService';
import { fileExists, getServerPath } from './serverRepository';
import { logger } from '@/lib/logger';

// Import from main service for now (will be refactored)
import { runningServers, serverLogs } from '../serverService';

/**
 * Validate server can be started
 */
async function validateServerStart(
  project: string
): Promise<{ valid: boolean; error?: string }> {
  if (!project) {
    return { valid: false, error: 'Project parameter is required' };
  }

  const existingProcess = runningServers.get(project);
  if (existingProcess && !existingProcess.killed) {
    return { valid: false, error: 'Server is already running' };
  }

  return { valid: true };
}

/**
 * Load server configuration
 */
async function loadServerConfiguration(project: string): Promise<{
  serverPath: string;
  startFileName: string;
  startScript: string;
}> {
  const serverPath = getServerPath(project);
  const metadata = await readMetadata(project);
  const startFileName = metadata?.startFile || 'startserver.sh';
  const startScript = `${serverPath}/${startFileName}`;

  return { serverPath, startFileName, startScript };
}

/**
 * Ensure Java is available
 */
async function ensureJavaAvailable(
  project: string,
  serverPath: string
): Promise<void> {
  const projectLogs = serverLogs.get(project) || [];
  projectLogs.push(`[${new Date().toLocaleTimeString()}] Java version check...`);
  serverLogs.set(project, projectLogs);

  try {
    const javaCheck = Bun.spawn(['java', '-version'], {
      cwd: serverPath,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        PATH: process.env.PATH + ':/usr/bin:/bin:/usr/local/bin',
      },
    });

    const javaExitCode = await javaCheck.exited;
    const logs = serverLogs.get(project) || [];
    
    if (javaExitCode === 0) {
      logs.push(`[${new Date().toLocaleTimeString()}] Java is available`);
    } else {
      logs.push(`[${new Date().toLocaleTimeString()}] WARNING: Java check failed (exit code: ${javaExitCode})`);
    }
    
    serverLogs.set(project, logs);
  } catch (error) {
    const logs = serverLogs.get(project) || [];
    logs.push(`[${new Date().toLocaleTimeString()}] ERROR: Java check failed: ${error}`);
    serverLogs.set(project, logs);
  }
}

/**
 * Make script executable (Unix only)
 */
async function makeScriptExecutable(
  serverPath: string,
  startScript: string
): Promise<void> {
  if (process.platform === 'win32') return;

  const chmodResult = await Bun.spawn(['chmod', '+x', startScript]).exited;
  if (chmodResult !== 0) {
    logger.warn(`chmod failed with exit code: ${chmodResult}`);
  }

  // Make all .sh files executable
  try {
    const fs = require('fs').promises;
    const files = await fs.readdir(serverPath);
    const shFiles = files.filter((file: string) => file.endsWith('.sh'));

    for (const shFile of shFiles) {
      const shPath = `${serverPath}/${shFile}`;
      await Bun.spawn(['chmod', '+x', shPath]).exited;
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Launch server process
 */
function launchServerProcess(
  serverPath: string,
  startFileName: string
): ServerProcess {
  const env = {
    ...process.env,
    PATH: process.env.PATH + ':/usr/bin:/bin:/usr/local/bin',
    TERM: 'xterm-256color',
    PWD: serverPath,
    JAVA_TOOL_OPTIONS: '-Djline.terminal=jline.UnsupportedTerminal',
  };

  const isWindowsScript = startFileName.endsWith('.bat') || startFileName.endsWith('.cmd');

  if (process.platform === 'win32' || isWindowsScript) {
    return Bun.spawn(['cmd', '/c', 'call', startFileName], {
      cwd: serverPath,
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'pipe',
      env,
    }) as ServerProcess;
  }

  return Bun.spawn(
    ['bash', '-c', `cd "${serverPath}" && exec bash ./${startFileName}`],
    {
      cwd: serverPath,
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'pipe',
      env,
    }
  ) as ServerProcess;
}

/**
 * Setup process output handlers
 */
function setupProcessHandlers(
  project: string,
  serverProcess: ServerProcess
): void {
  // Handle stdout
  if (serverProcess.stdout) {
    const reader = serverProcess.stdout.getReader();
    const decoder = new TextDecoder();

    const readStdout = async () => {
      try {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          const logs = serverLogs.get(project) || [];
          for (const line of lines) {
            if (line.trim()) {
              logs.push(line);
              if (logs.length > 300) logs.shift();
            }
          }
          serverLogs.set(project, logs);
        }

        if (buffer.trim()) {
          const logs = serverLogs.get(project) || [];
          logs.push(buffer);
          serverLogs.set(project, logs);
        }
      } catch {
        // Ignore read errors
      }
    };

    readStdout();
  }

  // Handle stderr
  if (serverProcess.stderr) {
    const reader = serverProcess.stderr.getReader();
    const decoder = new TextDecoder();

    const readStderr = async () => {
      try {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          const logs = serverLogs.get(project) || [];
          for (const line of lines) {
            if (line.trim()) {
              logs.push(line);
              if (logs.length > 300) logs.shift();
            }
          }
          serverLogs.set(project, logs);
        }

        if (buffer.trim()) {
          const logs = serverLogs.get(project) || [];
          logs.push(buffer);
          serverLogs.set(project, logs);
        }
      } catch {
        // Ignore read errors
      }
    };

    readStderr();
  }

  // Handle process exit
  serverProcess.exited.then((exitCode) => {
    const logs = serverLogs.get(project) || [];

    if (exitCode === 0) {
      logs.push(`[${new Date().toLocaleTimeString()}] Server stopped normally (exit code: ${exitCode})`);
    } else {
      logs.push(`[${new Date().toLocaleTimeString()}] Server crashed or failed (exit code: ${exitCode})`);

      if (exitCode === 1) {
        logs.push(`[${new Date().toLocaleTimeString()}] Hint: Check if Java is installed and server files are present`);
      } else if (exitCode === 127) {
        logs.push(`[${new Date().toLocaleTimeString()}] Hint: Command not found - check if startserver.sh exists and is executable`);
      }
    }

    serverLogs.set(project, logs);
    runningServers.delete(project);
  });
}

/**
 * Start a server
 */
export async function startServer(project: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const validation = await validateServerStart(project);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { serverPath, startFileName, startScript } = await loadServerConfiguration(project);

  const serverPathExists = await fileExists(serverPath);
  const startScriptExists = await fileExists(startScript);

  if (!serverPathExists || !startScriptExists) {
    return {
      success: false,
      error: `Server directory or start script not found. Looking for: ${startFileName}`,
    };
  }

  await makeScriptExecutable(serverPath, startScript);

  const debugInfo = [
    `[${new Date().toLocaleTimeString()}] Starting Minecraft server...`,
    `[${new Date().toLocaleTimeString()}] Working directory: ${serverPath}`,
    `[${new Date().toLocaleTimeString()}] Start file: ${startFileName}`,
  ];
  serverLogs.set(project, debugInfo);

  await ensureJavaAvailable(project, serverPath);

  const serverProcess = launchServerProcess(serverPath, startFileName);
  runningServers.set(project, serverProcess);

  const logs = serverLogs.get(project) || [];
  logs.push(`[${new Date().toLocaleTimeString()}] Server started with interactive console support`);
  serverLogs.set(project, logs);

  setupProcessHandlers(project, serverProcess);

  return { success: true, message: 'Server started successfully' };
}

/**
 * Stop a server
 */
export async function stopServer(project: string): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!project) {
    return { success: false, error: 'Project parameter is required' };
  }

  const serverProcess = runningServers.get(project);

  if (!serverProcess || serverProcess.killed) {
    return { success: false, error: 'Server is not running' };
  }

  const logs = serverLogs.get(project) || [];
  logs.push(`[${new Date().toLocaleTimeString()}] Stopping server...`);
  serverLogs.set(project, logs);

  serverProcess.kill();
  runningServers.delete(project);

  return { success: true, message: 'Server stopped successfully' };
}

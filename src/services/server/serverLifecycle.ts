/**
 * Server lifecycle management (start/stop)
 */

import type { ServerProcess } from "./server.types";
import { readMetadata } from "../metadataService";
import { fileExists } from "./serverRepository";
import { logger } from "@/lib/logger";

// Import from main service for now (will be refactored)
import { runningServers, serverLogs } from "../serverService";

/**
 * Validate server can be started
 */
async function validateServerStart(
  project: string
): Promise<{ valid: boolean; error?: string }> {
  if (!project) {
    return { valid: false, error: "Project parameter is required" };
  }

  const existingProcess = runningServers.get(project);
  if (existingProcess && !existingProcess.killed) {
    return { valid: false, error: "Server is already running" };
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
  const metadata = await readMetadata(project);
  const { getActualServerPath } = await import("./serverRepository");
  const serverPath = getActualServerPath(project, metadata?.projectPath);
  const startFileName = metadata?.startFile || "startserver.sh";
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
  projectLogs.push(
    `[${new Date().toLocaleTimeString()}] Java version check...`
  );
  serverLogs.set(project, projectLogs);

  logger.info(`[${project}] Checking Java availability in: ${serverPath}`);

  try {
    const javaCheck = Bun.spawn(["java", "-version"], {
      cwd: serverPath,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        PATH: process.env.PATH + ":/usr/bin:/bin:/usr/local/bin",
      },
    });

    const javaExitCode = await javaCheck.exited;
    const logs = serverLogs.get(project) || [];

    if (javaExitCode === 0) {
      // Try to get Java version from stderr
      try {
        const stderr = await new Response(javaCheck.stderr).text();
        const versionMatch = stderr.match(/version "([^"]+)"/);
        const versionInfo = versionMatch ? ` (${versionMatch[1]})` : "";
        logs.push(
          `[${new Date().toLocaleTimeString()}] Java is available${versionInfo}`
        );
        logger.info(`[${project}] Java is available${versionInfo}`);
      } catch {
        logs.push(`[${new Date().toLocaleTimeString()}] Java is available`);
        logger.info(`[${project}] Java is available`);
      }
    } else {
      logs.push(
        `[${new Date().toLocaleTimeString()}] WARNING: Java check failed (exit code: ${javaExitCode})`
      );
      logger.warn(
        `[${project}] Java check failed with exit code: ${javaExitCode}`
      );
    }

    serverLogs.set(project, logs);
  } catch (error) {
    const logs = serverLogs.get(project) || [];
    const errorMsg = error instanceof Error ? error.message : String(error);
    logs.push(
      `[${new Date().toLocaleTimeString()}] ERROR: Java check failed: ${errorMsg}`
    );
    logger.error(`[${project}] Java check failed: ${errorMsg}`);
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
  if (process.platform === "win32") return;

  const chmodResult = await Bun.spawn(["chmod", "+x", startScript]).exited;
  if (chmodResult !== 0) {
    logger.warn(`chmod failed with exit code: ${chmodResult}`);
  }

  // Make all .sh files executable
  try {
    const fs = require("fs").promises;
    const files = await fs.readdir(serverPath);
    const shFiles = files.filter((file: string) => file.endsWith(".sh"));

    for (const shFile of shFiles) {
      const shPath = `${serverPath}/${shFile}`;
      await Bun.spawn(["chmod", "+x", shPath]).exited;
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Launch server process
 */
async function launchServerProcess(
  project: string,
  serverPath: string,
  startFileName: string
): Promise<ServerProcess> {
  logger.info(`[${project}] Launching server process...`);
  logger.info(`[${project}]   Working directory: ${serverPath}`);
  logger.info(`[${project}]   Start file: ${startFileName}`);
  logger.info(`[${project}]   Platform: ${process.platform}`);

  // Load metadata to get Java version
  const metadata = await readMetadata(project);

  // Base environment - use Record<string, string> for proper typing
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PATH: (process.env.PATH || "") + ":/usr/bin:/bin:/usr/local/bin",
    TERM: "xterm-256color",
    PWD: serverPath,
    JAVA_TOOL_OPTIONS: "-Djline.terminal=jline.UnsupportedTerminal",
  };

  // If a specific Java version is configured, set Jabba environment
  if (metadata?.javaVersion) {
    logger.info(
      `[${project}] Configured Java version: ${metadata.javaVersion}`
    );
    try {
      const { getJabbaEnv } = await import("../java/jabbaUtils");
      const jabbaEnv = await getJabbaEnv(metadata.javaVersion);

      // Override environment with Jabba-specific Java
      if (jabbaEnv.JAVA_HOME) {
        env.JAVA_HOME = jabbaEnv.JAVA_HOME;
        logger.info(`[${project}]   JAVA_HOME: ${jabbaEnv.JAVA_HOME}`);
      }
      if (jabbaEnv.PATH) {
        env.PATH = jabbaEnv.PATH;
        logger.info(`[${project}]   PATH updated for Jabba`);
      }

      const logs = serverLogs.get(project) || [];
      logs.push(
        `[${new Date().toLocaleTimeString()}] Using Java version: ${
          metadata.javaVersion
        }`
      );
      logs.push(
        `[${new Date().toLocaleTimeString()}] JAVA_HOME: ${
          jabbaEnv.JAVA_HOME || "not set"
        }`
      );
      serverLogs.set(project, logs);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(
        `[${project}] Could not load Java version ${metadata.javaVersion}: ${errorMsg}`
      );
      const logs = serverLogs.get(project) || [];
      logs.push(
        `[${new Date().toLocaleTimeString()}] WARNING: Could not load Java version ${
          metadata.javaVersion
        }: ${errorMsg}`
      );
      serverLogs.set(project, logs);
    }
  } else {
    logger.info(`[${project}] Using system default Java`);
  }

  const isWindowsScript =
    startFileName.endsWith(".bat") || startFileName.endsWith(".cmd");

  if (process.platform === "win32" || isWindowsScript) {
    logger.info(
      `[${project}] Spawning Windows process: cmd /c call ${startFileName}`
    );
    return Bun.spawn(["cmd", "/c", "call", startFileName], {
      cwd: serverPath,
      stdout: "pipe",
      stderr: "pipe",
      stdin: "pipe",
      env,
    }) as ServerProcess;
  }

  const command = `cd "${serverPath}" && exec bash ./${startFileName}`;
  logger.info(`[${project}] Spawning Unix process: bash -c "${command}"`);

  return Bun.spawn(
    ["bash", "-c", `cd "${serverPath}" && exec bash ./${startFileName}`],
    {
      cwd: serverPath,
      stdout: "pipe",
      stderr: "pipe",
      stdin: "pipe",
      env,
    }
  ) as ServerProcess;
}

/**
 * Process log lines and add to server logs
 */
function processLogLines(project: string, lines: string[]): void {
  const logs = serverLogs.get(project) || [];

  for (const line of lines) {
    if (!line.trim()) continue;

    logs.push(line);
    if (logs.length > 300) {
      logs.shift();
    }
  }

  serverLogs.set(project, logs);
}

/**
 * Add remaining buffer content to logs
 */
function addBufferToLogs(project: string, buffer: string): void {
  if (!buffer.trim()) return;

  const logs = serverLogs.get(project) || [];
  logs.push(buffer);
  serverLogs.set(project, logs);
}

/**
 * Read stream and process output
 */
async function readStreamOutput(
  reader: globalThis.ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  project: string
): Promise<void> {
  try {
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      processLogLines(project, lines);
    }

    addBufferToLogs(project, buffer);
  } catch {
    // Ignore read errors
  }
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
    readStreamOutput(reader, decoder, project);
  }

  // Handle stderr
  if (serverProcess.stderr) {
    const reader = serverProcess.stderr.getReader();
    const decoder = new TextDecoder();
    readStreamOutput(reader, decoder, project);
  }

  // Handle process exit
  serverProcess.exited.then((exitCode) => {
    logger.info(`[${project}] Server process exited with code: ${exitCode}`);
    const logs = serverLogs.get(project) || [];

    if (exitCode === 0) {
      logs.push(
        `[${new Date().toLocaleTimeString()}] Server stopped normally (exit code: ${exitCode})`
      );
    } else {
      logger.error(
        `[${project}] Server crashed or failed with exit code: ${exitCode}`
      );
      logs.push(
        `[${new Date().toLocaleTimeString()}] Server crashed or failed (exit code: ${exitCode})`
      );

      if (exitCode === 1) {
        logger.error(
          `[${project}] Hint: Check if Java is installed and server files are present`
        );
        logs.push(
          `[${new Date().toLocaleTimeString()}] Hint: Check if Java is installed and server files are present`
        );
      } else if (exitCode === 127) {
        logger.error(
          `[${project}] Hint: Command not found - check if startserver.sh exists and is executable`
        );
        logs.push(
          `[${new Date().toLocaleTimeString()}] Hint: Command not found - check if startserver.sh exists and is executable`
        );
      } else if (exitCode === 126) {
        logger.error(
          `[${project}] Hint: Permission denied - check if startserver.sh is executable`
        );
        logs.push(
          `[${new Date().toLocaleTimeString()}] Hint: Permission denied - check if startserver.sh is executable`
        );
      }
    }

    serverLogs.set(project, logs);
    runningServers.delete(project);
  });
}

/**
 * Start a server
 */
export async function startServer(
  project: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  logger.info(`[${project}] ========== Starting Server ==========`);
  logger.info(`[${project}] Project: ${project}`);

  const validation = await validateServerStart(project);
  if (!validation.valid) {
    logger.error(`[${project}] Validation failed: ${validation.error}`);
    return { success: false, error: validation.error };
  }

  const { serverPath, startFileName, startScript } =
    await loadServerConfiguration(project);

  logger.info(`[${project}] Server path: ${serverPath}`);
  logger.info(`[${project}] Start script: ${startScript}`);

  const serverPathExists = await fileExists(serverPath);
  const startScriptExists = await fileExists(startScript);

  logger.info(`[${project}] Server path exists: ${serverPathExists}`);
  logger.info(`[${project}] Start script exists: ${startScriptExists}`);

  if (!serverPathExists || !startScriptExists) {
    logger.error(`[${project}] Server directory or start script not found`);
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

  const serverProcess = await launchServerProcess(
    project,
    serverPath,
    startFileName
  );
  runningServers.set(project, serverProcess);

  const logs = serverLogs.get(project) || [];
  logs.push(
    `[${new Date().toLocaleTimeString()}] Server started with interactive console support`
  );
  serverLogs.set(project, logs);

  setupProcessHandlers(project, serverProcess);

  // Reset RCON state on server start
  try {
    const { resetRconState } = await import("./rconService");
    resetRconState(project);
  } catch {
    // Ignore if RCON service not available
  }

  return { success: true, message: "Server started successfully" };
}

/**
 * Stop a server
 */
export async function stopServer(
  project: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!project) {
    return { success: false, error: "Project parameter is required" };
  }

  const serverProcess = runningServers.get(project);

  if (!serverProcess || serverProcess.killed) {
    return { success: false, error: "Server is not running" };
  }

  const logs = serverLogs.get(project) || [];
  logs.push(`[${new Date().toLocaleTimeString()}] Stopping server...`);
  serverLogs.set(project, logs);

  serverProcess.kill();
  runningServers.delete(project);

  return { success: true, message: "Server stopped successfully" };
}

/**
 * Send a command to a running server
 */
export async function sendCommand(
  project: string,
  command: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!project) {
    return { success: false, error: "Project parameter is required" };
  }

  if (!command || !command.trim()) {
    return { success: false, error: "Command is required" };
  }

  const serverProcess = runningServers.get(project);

  if (!serverProcess || serverProcess.killed) {
    return { success: false, error: "Server is not running" };
  }

  if (!serverProcess.stdin) {
    return { success: false, error: "Server stdin is not available" };
  }

  try {
    // Add command to logs for visibility
    const logs = serverLogs.get(project) || [];
    logs.push(`> ${command}`);
    serverLogs.set(project, logs);

    // Write to stdin using Bun's FileSink API
    serverProcess.stdin.write(command + "\n");

    return { success: true, message: "Command sent successfully" };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send command: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

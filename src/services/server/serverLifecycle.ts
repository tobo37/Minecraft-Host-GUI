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
 * Validate Java availability before server start
 * Checks if configured Java version is installed or if system Java is available
 */
async function validateJavaAvailability(
  project: string
): Promise<{ valid: boolean; error?: string }> {
  logger.info(`[${project}] Validating Java availability...`);

  const metadata = await readMetadata(project);

  // If a specific Jabba version is configured, validate it's installed
  if (metadata?.javaVersion) {
    logger.info(
      `[${project}] Checking if configured Java version is installed: ${metadata.javaVersion}`
    );

    try {
      const { getJabbaInfo } = await import("../java/jabbaInfo");
      const jabbaInfo = await getJabbaInfo();

      if (!jabbaInfo.installed) {
        const errorMsg =
          "Jabba is not installed. Please install Jabba or remove the Java version configuration.";
        logger.error(`[${project}] ${errorMsg}`);
        return { valid: false, error: errorMsg };
      }

      if (!jabbaInfo.versions?.includes(metadata.javaVersion)) {
        const errorMsg = `Java version ${metadata.javaVersion} is not installed. Please install it first or select a different version.`;
        logger.error(`[${project}] ${errorMsg}`);
        return { valid: false, error: errorMsg };
      }

      logger.info(
        `[${project}] ✓ Configured Java version ${metadata.javaVersion} is installed`
      );
      return { valid: true };
    } catch (error) {
      const errorMsg = `Failed to validate Java version: ${
        error instanceof Error ? error.message : String(error)
      }`;
      logger.error(`[${project}] ${errorMsg}`);
      return { valid: false, error: errorMsg };
    }
  }

  // No Jabba version configured - check for system Java
  logger.info(`[${project}] No Jabba version configured, checking system Java`);

  try {
    const { getJavaInfo } = await import("../java/javaInfo");
    const javaInfo = await getJavaInfo();

    if (!javaInfo.installed) {
      const errorMsg =
        "No Java installation found. Please install Java or configure a Jabba version.";
      logger.error(`[${project}] ${errorMsg}`);
      return { valid: false, error: errorMsg };
    }

    logger.info(
      `[${project}] ✓ System Java is available (version: ${javaInfo.version})`
    );
    return { valid: true };
  } catch (error) {
    const errorMsg = `Failed to check system Java: ${
      error instanceof Error ? error.message : String(error)
    }`;
    logger.error(`[${project}] ${errorMsg}`);
    return { valid: false, error: errorMsg };
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
      `[${project}] ========== Java Configuration (Jabba) ==========`
    );
    logger.info(
      `[${project}] Configured Java version: ${metadata.javaVersion}`
    );

    try {
      const { getJabbaEnv } = await import("../java/jabbaUtils");
      const jabbaEnv = await getJabbaEnv(metadata.javaVersion);

      // Override environment with Jabba-specific Java
      if (jabbaEnv.JAVA_HOME) {
        env.JAVA_HOME = jabbaEnv.JAVA_HOME;
        logger.info(`[${project}] JAVA_HOME: ${jabbaEnv.JAVA_HOME}`);
      }
      if (jabbaEnv.PATH) {
        env.PATH = jabbaEnv.PATH;
        // Log the Java bin directory that was prepended to PATH
        const javaBinPath = jabbaEnv.PATH.split(
          process.platform === "win32" ? ";" : ":"
        )[0];
        logger.info(`[${project}] PATH (Java bin): ${javaBinPath}`);
      }

      logger.info(`[${project}] ✓ Jabba environment loaded successfully`);

      const logs = serverLogs.get(project) || [];
      logs.push(
        `[${new Date().toLocaleTimeString()}] Using Jabba Java version: ${
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
      logger.error(
        `[${project}] Failed to load Java version ${metadata.javaVersion}: ${errorMsg}`
      );
      logger.warn(
        `[${project}] This should not happen as validation passed. Check Jabba installation.`
      );

      const logs = serverLogs.get(project) || [];
      logs.push(
        `[${new Date().toLocaleTimeString()}] ERROR: Could not load Java version ${
          metadata.javaVersion
        }: ${errorMsg}`
      );
      logs.push(
        `[${new Date().toLocaleTimeString()}] Server may fail to start without proper Java configuration`
      );
      serverLogs.set(project, logs);
    }
  } else {
    // Using system Java - log information about it
    logger.info(
      `[${project}] ========== Java Configuration (System) ==========`
    );
    logger.info(`[${project}] Using system default Java`);

    try {
      const { getJavaInfo } = await import("../java/javaInfo");
      const javaInfo = await getJavaInfo();

      if (javaInfo.installed) {
        logger.info(
          `[${project}] System Java version: ${javaInfo.version || "Unknown"}`
        );
        if (javaInfo.path) {
          logger.info(`[${project}] System Java path: ${javaInfo.path}`);
        }
        if (process.env.JAVA_HOME) {
          logger.info(`[${project}] JAVA_HOME: ${process.env.JAVA_HOME}`);
        } else {
          logger.info(`[${project}] JAVA_HOME: not set (using system PATH)`);
        }

        const logs = serverLogs.get(project) || [];
        logs.push(
          `[${new Date().toLocaleTimeString()}] Using system Java: ${
            javaInfo.version || "Unknown"
          }`
        );
        serverLogs.set(project, logs);
      } else {
        logger.warn(`[${project}] System Java information not available`);
      }
    } catch (error) {
      logger.warn(
        `[${project}] Could not retrieve system Java information: ${error}`
      );
    }
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

  // Use bash -x for debugging to see what commands are being executed
  const command = `cd "${serverPath}" && bash -x ./${startFileName}`;
  logger.info(`[${project}] Spawning Unix process: bash -c "${command}"`);

  return Bun.spawn(
    ["bash", "-c", `cd "${serverPath}" && bash -x ./${startFileName}`],
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
      logs.push(
        `[${new Date().toLocaleTimeString()}] Check the output above for error details from the start script`
      );

      if (exitCode === 1) {
        logger.error(
          `[${project}] Hint: Exit code 1 usually means the start script encountered an error`
        );
        logs.push(
          `[${new Date().toLocaleTimeString()}] Common causes: Java not found, missing libraries, or script errors`
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

  // Validate Java availability before proceeding
  const javaValidation = await validateJavaAvailability(project);
  if (!javaValidation.valid) {
    logger.error(
      `[${project}] Java validation failed: ${javaValidation.error}`
    );
    return { success: false, error: javaValidation.error };
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

  // On Linux/Unix, log directory contents and file permissions before starting
  if (process.platform !== "win32") {
    logger.info(`[${project}] Checking directory contents and permissions...`);

    try {
      // List directory contents
      const lsProcess = Bun.spawn(["ls", "-la", serverPath], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const lsOutput = await new Response(lsProcess.stdout).text();
      const lsExitCode = await lsProcess.exited;

      if (lsExitCode === 0) {
        logger.info(`[${project}] Directory listing (ls -la):`);
        const lines = lsOutput.split("\n").slice(0, 20); // First 20 lines
        lines.forEach((line) => {
          if (line.trim()) logger.info(`  ${line}`);
        });
      }

      // Check start file permissions specifically
      const statProcess = Bun.spawn(["ls", "-l", startScript], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const statOutput = await new Response(statProcess.stdout).text();
      const statExitCode = await statProcess.exited;

      if (statExitCode === 0) {
        logger.info(
          `[${project}] Start file permissions (ls -l ${startFileName}):`
        );
        logger.info(`  ${statOutput.trim()}`);

        // Check if executable bit is set
        if (statOutput.includes("x")) {
          logger.info(`[${project}] ✓ Start file has executable permission`);
        } else {
          logger.warn(
            `[${project}] ⚠ Start file is NOT executable - will attempt chmod`
          );
        }
      }
    } catch (error) {
      logger.warn(`[${project}] Could not check permissions: ${error}`);
    }
  }

  await makeScriptExecutable(serverPath, startScript);

  const debugInfo = [
    `[${new Date().toLocaleTimeString()}] Starting Minecraft server...`,
    `[${new Date().toLocaleTimeString()}] Working directory: ${serverPath}`,
    `[${new Date().toLocaleTimeString()}] Start file: ${startFileName}`,
  ];
  serverLogs.set(project, debugInfo);

  // Test Java availability before starting server
  try {
    const metadata = await readMetadata(project);
    let testEnv = { ...process.env } as Record<string, string>;

    if (metadata?.javaVersion) {
      const { getJabbaEnv } = await import("../java/jabbaUtils");
      testEnv = { ...testEnv, ...(await getJabbaEnv(metadata.javaVersion)) };
    }

    const javaTest = Bun.spawn(["java", "-version"], {
      env: testEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const javaTestOutput = await new Response(javaTest.stderr).text();
    const javaTestExitCode = await javaTest.exited;

    const logs = serverLogs.get(project) || [];
    if (javaTestExitCode === 0) {
      logs.push(
        `[${new Date().toLocaleTimeString()}] ✓ Java is accessible: ${javaTestOutput
          .split("\n")[0]
          .trim()}`
      );
    } else {
      logs.push(
        `[${new Date().toLocaleTimeString()}] ⚠ Java test failed with exit code ${javaTestExitCode}`
      );
      logs.push(
        `[${new Date().toLocaleTimeString()}] This may cause the server to fail`
      );
    }
    serverLogs.set(project, logs);
  } catch (error) {
    const logs = serverLogs.get(project) || [];
    logs.push(
      `[${new Date().toLocaleTimeString()}] ⚠ Could not test Java: ${error}`
    );
    serverLogs.set(project, logs);
  }

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

import type { Server } from "./types";
import {
  writeMetadata,
  validateCustomName,
  validateDescription,
  readMetadata,
  migrateMetadata,
} from "./metadataService";
import AdmZip from "adm-zip";

// Global server process management
export const runningServers = new Map<string, any>();
export const serverLogs = new Map<string, string[]>();

/**
 * List all servers
 */
export async function listServers(): Promise<Response> {
  try {
    const serverDir = "./server";

    // Use readdir to get all entries including directories
    const fs = require("fs").promises;
    const entries = await fs.readdir(serverDir);

    const servers: Server[] = [];
    for (const entry of entries) {
      if (entry === ".gitkeep") continue;

      const serverPath = `${serverDir}/${entry}`;

      // Check if it's a directory
      const stat = await fs.stat(serverPath);
      if (!stat.isDirectory()) continue;

      // Try to read metadata, migrate if missing
      let metadata = await readMetadata(entry);
      if (!metadata) {
        // Metadata file missing, perform migration
        try {
          metadata = await migrateMetadata(entry);
        } catch (error) {
          console.error(`Failed to migrate metadata for ${entry}:`, error);
          // Continue with fallback data
          const createdFile = `${serverPath}/.created`;
          let createdAt = entry;
          try {
            const createdContent = await Bun.file(createdFile).text();
            createdAt = createdContent.trim();
          } catch {
            // Use directory name as fallback
          }

          servers.push({
            name: entry,
            path: entry,
            createdAt,
          });
          continue;
        }
      }

      // Check server running status
      const serverProcess = runningServers.get(entry);
      const status =
        serverProcess && !serverProcess.killed ? "running" : "stopped";

      // Build server object with metadata
      servers.push({
        name: metadata.customName || entry,
        path: entry,
        createdAt: metadata.createdAt,
        customName: metadata.customName,
        description: metadata.description,
        sourceZipFile: metadata.sourceZipFile,
        status,
        lastModified: metadata.lastModified,
      });
    }

    // Sort by last modified date (newest first)
    servers.sort(
      (a, b) =>
        new Date(b.lastModified || b.createdAt).getTime() -
        new Date(a.lastModified || a.createdAt).getTime()
    );

    return Response.json({
      servers,
      count: servers.length,
    });
  } catch (error) {
    console.error("Error listing servers:", error);
    return Response.json(
      {
        message: "Failed to list servers",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new server
 */
export async function createServer(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { serverFile, customName, description } = body;

    // Validate custom name if provided
    if (customName) {
      const nameValidation = validateCustomName(customName);
      if (!nameValidation.valid) {
        return Response.json(
          {
            message: nameValidation.error,
            status: "error",
          },
          { status: 400 }
        );
      }
    }

    // Validate description if provided
    if (description) {
      const descValidation = validateDescription(description);
      if (!descValidation.valid) {
        return Response.json(
          {
            message: descValidation.error,
            status: "error",
          },
          { status: 400 }
        );
      }
    }

    // Aktuelles Datum im Format yyyy-mm-dd
    const now = new Date();
    const dateString =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const serverPath = `./server/${dateString}`;

    // Determine which server file to use
    let serverFilesZip;
    if (serverFile) {
      serverFilesZip = `./serverfiles/${serverFile}`;
    } else {
      // Fallback to default file
      serverFilesZip = "./serverfiles/ServerFiles-4.14.zip";
    }

    // Prüfen ob Server-Ordner bereits existiert
    const serverDir = Bun.file(serverPath);
    if (await Bun.file(`${serverPath}/.created`).exists()) {
      return Response.json({
        message: "Server for this date already exists",
        status: "exists",
        serverPath: dateString,
      });
    }

    // Server-Ordner erstellen
    await Bun.write(`${serverPath}/.gitkeep`, "");

    // ZIP-Datei prüfen
    const zipFile = Bun.file(serverFilesZip);
    if (!(await zipFile.exists())) {
      return Response.json(
        {
          message: `Server file not found: ${
            serverFile || "ServerFiles-4.14.zip"
          }`,
          status: "error",
        },
        { status: 404 }
      );
    }

    // ZIP entpacken mit reinem TypeScript (cross-platform: Linux/Windows)
    console.log(`Starting extraction of ${serverFilesZip} to ${serverPath}`);
    
    try {
      // Pure TypeScript ZIP extraction using adm-zip library
      // Works on all platforms without external shell commands
      console.log("Using adm-zip library for cross-platform extraction");
      
      const zip = new AdmZip(serverFilesZip);
      zip.extractAllTo(serverPath, true);
      
      console.log(`Successfully extracted ZIP file with adm-zip library`);
      // Marker-Datei erstellen um zu zeigen, dass Server erfolgreich erstellt wurde
      const createdTimestamp = new Date().toISOString();
      console.log(`Creating .created file with timestamp: ${createdTimestamp}`);

      try {
        await Bun.write(`${serverPath}/.created`, createdTimestamp);
        console.log(`Successfully created .created file`);

        // Verify the file was created
        const createdFileExists = await Bun.file(
          `${serverPath}/.created`
        ).exists();
        console.log(`Verification: .created file exists: ${createdFileExists}`);

        // Extract ZIP filename from path
        const zipFileName = serverFile || "ServerFiles-4.14.zip";

        // Determine the custom name to use (provided or default to ZIP filename)
        const finalCustomName = customName || zipFileName.replace(".zip", "");

        // Create metadata file
        const metadata = {
          customName: finalCustomName,
          description: description || "",
          createdAt: createdTimestamp,
          lastModified: createdTimestamp,
          sourceZipFile: zipFileName,
        };

        await writeMetadata(dateString, metadata);
        console.log(`Successfully created metadata file`);

        return Response.json({
          message: "Server created successfully",
          status: "success",
          serverPath: dateString,
          createdAt: createdTimestamp,
          usedServerFile: zipFileName,
          metadata,
        });
      } catch (writeError) {
        console.error("Error creating .created file:", writeError);
        return Response.json(
          {
            message: "Server extracted but failed to create marker file",
            status: "error",
            error:
              writeError instanceof Error
                ? writeError.message
                : "Unknown write error",
          },
          { status: 500 }
        );
      }
    } catch (extractError) {
      console.error("ZIP extraction failed:", extractError);
      
      // Clean up on failure
      try {
        const fs = require("fs").promises;
        await fs.rm(serverPath, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error("Cleanup failed:", cleanupError);
      }

      return Response.json(
        {
          message: "Failed to extract server files",
          status: "error",
          error: extractError instanceof Error ? extractError.message : "Unknown extraction error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Server creation error:", error);
    return Response.json(
      {
        message: "Internal server error",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
/**
 
* Get server status
 */
export async function getServerStatus(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const project = url.searchParams.get("project");

    if (!project) {
      return Response.json(
        {
          success: false,
          error: "Project parameter is required",
        },
        { status: 400 }
      );
    }

    const serverProcess = runningServers.get(project);
    let status = "stopped";

    if (serverProcess && !serverProcess.killed) {
      status = "running";
    }

    return Response.json({
      success: true,
      status: status,
    });
  } catch (error) {
    console.error("Error checking server status:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Start a server
 */
export async function startServer(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { project } = body;

    if (!project) {
      return Response.json(
        {
          success: false,
          error: "Project parameter is required",
        },
        { status: 400 }
      );
    }

    // Check if server is already running
    const existingProcess = runningServers.get(project);
    if (existingProcess && !existingProcess.killed) {
      return Response.json(
        {
          success: false,
          error: "Server is already running",
        },
        { status: 400 }
      );
    }

    const serverPath = `./server/${project}`;
    const startScript = `${serverPath}/startserver.sh`;

    // Check if server directory and start script exist
    const fs = require("fs").promises;
    try {
      await fs.access(serverPath);
      await fs.access(startScript);
    } catch {
      return Response.json(
        {
          success: false,
          error: "Server directory or start script not found",
        },
        { status: 404 }
      );
    }

    // Make start script executable
    console.log(`Making ${startScript} executable...`);
    const chmodResult = await Bun.spawn(["chmod", "+x", startScript]).exited;
    if (chmodResult !== 0) {
      console.warn(`chmod failed with exit code: ${chmodResult}`);
    }

    // Also make any other .sh files executable for good measure
    try {
      const fs = require("fs").promises;
      const files = await fs.readdir(serverPath);
      const shFiles = files.filter((file: string) => file.endsWith(".sh"));

      for (const shFile of shFiles as string[]) {
        const shPath = `${serverPath}/${shFile}`;
        console.log(`Making ${shPath} executable...`);
        await Bun.spawn(["chmod", "+x", shPath]).exited;
      }
    } catch (error) {
      console.warn("Error making additional .sh files executable:", error);
    }

    // Initialize logs for this project with debug info
    const debugInfo = [
      `[${new Date().toLocaleTimeString()}] Starting Minecraft server...`,
      `[${new Date().toLocaleTimeString()}] Working directory: ${serverPath}`,
      `[${new Date().toLocaleTimeString()}] Java version check...`,
    ];
    serverLogs.set(project, debugInfo);

    // Check Java version before starting
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
      const projectLogs = serverLogs.get(project) || [];
      if (javaExitCode === 0) {
        projectLogs.push(
          `[${new Date().toLocaleTimeString()}] Java is available`
        );
      } else {
        projectLogs.push(
          `[${new Date().toLocaleTimeString()}] WARNING: Java check failed (exit code: ${javaExitCode})`
        );
      }
      serverLogs.set(project, projectLogs);
    } catch (error) {
      const projectLogs = serverLogs.get(project) || [];
      projectLogs.push(
        `[${new Date().toLocaleTimeString()}] ERROR: Java check failed: ${error}`
      );
      serverLogs.set(project, projectLogs);
    }

    // Start the server process with proper environment and PTY support
    console.log(
      `Starting server for project: ${project} in directory: ${serverPath}`
    );

    // Get current environment and add common paths
    const env = {
      ...process.env,
      PATH: process.env.PATH + ":/usr/bin:/bin:/usr/local/bin",
      TERM: "xterm-256color",
      PWD: serverPath,
      // Enable interactive mode for Minecraft server
      JAVA_TOOL_OPTIONS: "-Djline.terminal=jline.UnsupportedTerminal",
    };

    // Start server with script wrapper that enables interactive mode
    const serverProcess = Bun.spawn(
      [
        "bash",
        "-c",
        `
      # Make sure we're in the right directory
      cd "${serverPath}"
      
      # Start the server with proper terminal settings
      exec bash ./startserver.sh
    `,
      ],
      {
        cwd: serverPath,
        stdout: "pipe",
        stderr: "pipe",
        stdin: "pipe",
        env: env,
      }
    );

    const projectLogs = serverLogs.get(project) || [];
    projectLogs.push(
      `[${new Date().toLocaleTimeString()}] Server started with interactive console support`
    );
    serverLogs.set(project, projectLogs);

    // Store the process
    runningServers.set(project, serverProcess);

    // Handle stdout - stream console output directly
    if (serverProcess.stdout) {
      const reader = serverProcess.stdout.getReader();
      const decoder = new TextDecoder();

      const readStdout = async () => {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            const projectLogs = serverLogs.get(project) || [];
            for (const line of lines) {
              if (line.trim()) {
                // Don't add timestamp to preserve original console formatting
                projectLogs.push(line);
                // Keep only last 300 lines for better console history
                if (projectLogs.length > 300) {
                  projectLogs.shift();
                }
              }
            }
            serverLogs.set(project, projectLogs);
          }

          // Handle any remaining buffer content
          if (buffer.trim()) {
            const projectLogs = serverLogs.get(project) || [];
            projectLogs.push(buffer);
            serverLogs.set(project, projectLogs);
          }
        } catch (error) {
          console.error(`Error reading stdout for ${project}:`, error);
        }
      };

      readStdout();
    }

    // Handle stderr - preserve original error formatting
    if (serverProcess.stderr) {
      const reader = serverProcess.stderr.getReader();
      const decoder = new TextDecoder();

      const readStderr = async () => {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            const projectLogs = serverLogs.get(project) || [];
            for (const line of lines) {
              if (line.trim()) {
                // Preserve original error formatting
                projectLogs.push(line);
                if (projectLogs.length > 300) {
                  projectLogs.shift();
                }
              }
            }
            serverLogs.set(project, projectLogs);
          }

          if (buffer.trim()) {
            const projectLogs = serverLogs.get(project) || [];
            projectLogs.push(buffer);
            serverLogs.set(project, projectLogs);
          }
        } catch (error) {
          console.error(`Error reading stderr for ${project}:`, error);
        }
      };

      readStderr();
    }

    // Handle process exit
    serverProcess.exited.then((exitCode) => {
      console.log(
        `Server process for ${project} exited with code: ${exitCode}`
      );
      const projectLogs = serverLogs.get(project) || [];

      if (exitCode === 0) {
        projectLogs.push(
          `[${new Date().toLocaleTimeString()}] Server stopped normally (exit code: ${exitCode})`
        );
      } else {
        projectLogs.push(
          `[${new Date().toLocaleTimeString()}] Server crashed or failed (exit code: ${exitCode})`
        );

        // Add some common troubleshooting hints
        if (exitCode === 1) {
          projectLogs.push(
            `[${new Date().toLocaleTimeString()}] Hint: Check if Java is installed and server files are present`
          );
        } else if (exitCode === 127) {
          projectLogs.push(
            `[${new Date().toLocaleTimeString()}] Hint: Command not found - check if startserver.sh exists and is executable`
          );
        }
      }

      serverLogs.set(project, projectLogs);
      runningServers.delete(project);
    });

    return Response.json({
      success: true,
      message: "Server started successfully",
    });
  } catch (error) {
    console.error("Error starting server:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Stop a server
 */
export async function stopServer(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { project } = body;

    if (!project) {
      return Response.json(
        {
          success: false,
          error: "Project parameter is required",
        },
        { status: 400 }
      );
    }

    const serverProcess = runningServers.get(project);

    if (!serverProcess || serverProcess.killed) {
      return Response.json(
        {
          success: false,
          error: "Server is not running",
        },
        { status: 400 }
      );
    }

    // Add stop message to logs
    const projectLogs = serverLogs.get(project) || [];
    projectLogs.push(`[${new Date().toLocaleTimeString()}] Stopping server...`);
    serverLogs.set(project, projectLogs);

    // Kill the server process
    console.log(`Stopping server for project: ${project}`);
    serverProcess.kill();

    // Remove from running servers
    runningServers.delete(project);

    return Response.json({
      success: true,
      message: "Server stopped successfully",
    });
  } catch (error) {
    console.error("Error stopping server:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get server logs
 */
export async function getServerLogs(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const project = url.searchParams.get("project");

    if (!project) {
      return Response.json(
        {
          success: false,
          error: "Project parameter is required",
        },
        { status: 400 }
      );
    }

    // Get logs from memory
    const logs = serverLogs.get(project) || [];

    return Response.json({
      success: true,
      logs: logs.slice(-100), // Return last 100 lines
    });
  } catch (error) {
    console.error("Error fetching server logs:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

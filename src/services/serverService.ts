import { listServers as listServersCore } from './server/serverList';
import { createServer as createServerCore } from './server/serverCreate';
import { startServer as startServerCore, stopServer as stopServerCore } from './server/serverLifecycle';
import type { ServerProcess } from './server/server.types';

// Global server process management
export const runningServers = new Map<string, ServerProcess>();
export const serverLogs = new Map<string, string[]>();

/**
 * List all servers
 */
export async function listServers(): Promise<Response> {
  try {
    const servers = await listServersCore();

    return Response.json({
      success: true,
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

    const result = await createServerCore({ serverFile, customName, description });

    if (!result.success) {
      const status = result.message.includes('already exists') ? 200 : 
                     result.message.includes('not found') ? 404 : 400;
      return Response.json(
        {
          message: result.message,
          status: result.success ? 'success' : 'error',
          serverPath: result.serverPath,
        },
        { status }
      );
    }

    return Response.json({
      message: result.message,
      status: 'success',
      serverPath: result.serverPath,
      createdAt: result.createdAt,
      usedServerFile: result.usedServerFile,
      metadata: result.metadata,
    });
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

    const result = await startServerCore(project);

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 400;
      return Response.json(
        {
          success: false,
          error: result.error,
        },
        { status }
      );
    }

    return Response.json({
      success: true,
      message: result.message,
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

    const result = await stopServerCore(project);

    if (!result.success) {
      return Response.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: result.message,
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

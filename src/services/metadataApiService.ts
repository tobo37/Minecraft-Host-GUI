import {
  updateMetadata,
  validateCustomName,
  validateDescription,
  readMetadata,
} from "./metadataService";
import { runningServers } from "./serverService";

/**
 * Update server metadata (rename, change description)
 * POST /api/server/metadata
 */
export async function updateServerMetadata(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { project, customName, description } = body;

    // Validate required parameter
    if (!project) {
      return Response.json(
        {
          success: false,
          error: "Project parameter is required",
        },
        { status: 400 }
      );
    }

    // Validate project path to prevent traversal attacks
    if (
      project.includes("..") ||
      project.includes("/") ||
      project.includes("\\")
    ) {
      return Response.json(
        {
          success: false,
          error: "Invalid project path",
        },
        { status: 403 }
      );
    }

    // Check if server directory exists
    const serverPath = `./server/${project}`;
    const fs = require("fs").promises;
    try {
      await fs.access(serverPath);
    } catch {
      return Response.json(
        {
          success: false,
          error: "Server not found",
        },
        { status: 404 }
      );
    }

    // Validate custom name if provided
    if (customName !== undefined) {
      // When updating, empty names are not allowed
      if (!customName || customName.trim().length === 0) {
        return Response.json(
          {
            success: false,
            error: "Custom name cannot be empty when updating",
          },
          { status: 400 }
        );
      }
      
      const nameValidation = validateCustomName(customName);
      if (!nameValidation.valid) {
        return Response.json(
          {
            success: false,
            error: nameValidation.error,
          },
          { status: 400 }
        );
      }
    }

    // Validate description if provided
    if (description !== undefined) {
      const descValidation = validateDescription(description);
      if (!descValidation.valid) {
        return Response.json(
          {
            success: false,
            error: descValidation.error,
          },
          { status: 400 }
        );
      }
    }

    // Build updates object with only provided fields
    const updates: any = {};
    if (customName !== undefined) {
      updates.customName = customName;
    }
    if (description !== undefined) {
      updates.description = description;
    }

    // Update metadata
    await updateMetadata(project, updates);

    // Read and return updated metadata
    const updatedMetadata = await readMetadata(project);

    return Response.json({
      success: true,
      metadata: updatedMetadata,
    });
  } catch (error) {
    console.error("Error updating metadata:", error);
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
 * Delete a server instance
 * DELETE /api/server/delete
 */
export async function deleteServerInstance(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const project = url.searchParams.get("project");

    // Validate required parameter
    if (!project) {
      return Response.json(
        {
          success: false,
          error: "Project parameter is required",
        },
        { status: 400 }
      );
    }

    // Validate project path to prevent traversal attacks
    if (
      project.includes("..") ||
      project.includes("/") ||
      project.includes("\\")
    ) {
      return Response.json(
        {
          success: false,
          error: "Invalid project path",
        },
        { status: 403 }
      );
    }

    const serverPath = `./server/${project}`;

    // Check if server directory exists
    const fs = require("fs").promises;
    try {
      await fs.access(serverPath);
    } catch {
      return Response.json(
        {
          success: false,
          error: "Server not found",
        },
        { status: 404 }
      );
    }

    // Check if server is running and stop it if necessary
    const serverProcess = runningServers.get(project);
    if (serverProcess && !serverProcess.killed) {
      console.log(`Stopping running server ${project} before deletion...`);
      serverProcess.kill();
      runningServers.delete(project);

      // Wait a moment for the process to fully terminate
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Delete the entire server directory recursively
    console.log(`Deleting server directory: ${serverPath}`);
    await fs.rm(serverPath, { recursive: true, force: true });

    return Response.json({
      success: true,
      message: `Server ${project} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting server:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import {
  updateMetadata,
  validateCustomName,
  validateDescription,
  readMetadata,
} from "./metadataService";
import { runningServers } from "./serverService";
import { logger } from "@/lib/logger";

interface MetadataUpdateRequest {
  project: string;
  customName?: string;
  description?: string;
  projectPath?: string;
  startFile?: string;
  javaVersion?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  status?: number;
}

/**
 * Validate project parameter
 */
function validateProject(project: string): ValidationResult {
  if (!project) {
    return {
      valid: false,
      error: "Project parameter is required",
      status: 400,
    };
  }

  if (project.includes("..") || project.includes("/") || project.includes("\\")) {
    return {
      valid: false,
      error: "Invalid project path",
      status: 403,
    };
  }

  return { valid: true };
}

/**
 * Check if server directory exists
 */
async function checkServerExists(project: string): Promise<ValidationResult> {
  const serverPath = `./server/${project}`;
  const fs = require("fs").promises;
  try {
    await fs.access(serverPath);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: "Server not found",
      status: 404,
    };
  }
}

/**
 * Validate custom name field
 */
function validateCustomNameField(customName?: string): ValidationResult {
  if (customName === undefined) {
    return { valid: true };
  }

  if (!customName || customName.trim().length === 0) {
    return {
      valid: false,
      error: "Custom name cannot be empty when updating",
      status: 400,
    };
  }

  const nameValidation = validateCustomName(customName);
  if (!nameValidation.valid) {
    return {
      valid: false,
      error: nameValidation.error,
      status: 400,
    };
  }

  return { valid: true };
}

/**
 * Validate description field
 */
function validateDescriptionField(description?: string): ValidationResult {
  if (description === undefined) {
    return { valid: true };
  }

  const descValidation = validateDescription(description);
  if (!descValidation.valid) {
    return {
      valid: false,
      error: descValidation.error,
      status: 400,
    };
  }

  return { valid: true };
}

/**
 * Validate metadata update request
 */
async function validateMetadata(
  project: string,
  customName?: string,
  description?: string
): Promise<ValidationResult> {
  const projectValidation = validateProject(project);
  if (!projectValidation.valid) {
    return projectValidation;
  }

  const existsValidation = await checkServerExists(project);
  if (!existsValidation.valid) {
    return existsValidation;
  }

  const nameValidation = validateCustomNameField(customName);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  const descValidation = validateDescriptionField(description);
  if (!descValidation.valid) {
    return descValidation;
  }

  return { valid: true };
}

/**
 * Merge new metadata with existing metadata
 */
function mergeMetadata(
  customName?: string,
  description?: string,
  projectPath?: string,
  startFile?: string,
  javaVersion?: string
): Record<string, string> {
  const updates: Record<string, string> = {};

  if (customName !== undefined) {
    updates.customName = customName;
  }
  if (description !== undefined) {
    updates.description = description;
  }
  if (projectPath !== undefined) {
    updates.projectPath = projectPath;
  }
  if (startFile !== undefined) {
    updates.startFile = startFile;
  }
  if (javaVersion !== undefined) {
    updates.javaVersion = javaVersion;
  }

  return updates;
}

/**
 * Save updated metadata to disk
 */
async function saveMetadata(project: string, updates: Record<string, string>) {
  await updateMetadata(project, updates);
  return await readMetadata(project);
}

/**
 * Update server metadata (rename, change description, set project path, set start file)
 * POST /api/server/metadata
 */
export async function updateServerMetadata(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { project, customName, description, projectPath, startFile, javaVersion } =
      body as MetadataUpdateRequest;

    // Validate metadata
    const validation = await validateMetadata(project, customName, description);
    if (!validation.valid) {
      return Response.json(
        {
          success: false,
          error: validation.error,
        },
        { status: validation.status || 400 }
      );
    }

    // Merge updates
    const updates = mergeMetadata(customName, description, projectPath, startFile, javaVersion);

    // Save metadata and get updated version
    const updatedMetadata = await saveMetadata(project, updates);

    return Response.json({
      success: true,
      metadata: updatedMetadata,
    });
  } catch (error) {
    logger.error("Error updating metadata:", error);
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
 * Validate deletion request
 */
async function validateDeletion(project: string | null): Promise<ValidationResult> {
  // Validate required parameter
  if (!project) {
    return {
      valid: false,
      error: "Project parameter is required",
      status: 400,
    };
  }

  // Validate project path to prevent traversal attacks
  if (project.includes("..") || project.includes("/") || project.includes("\\")) {
    return {
      valid: false,
      error: "Invalid project path",
      status: 403,
    };
  }

  // Check if server directory exists
  const serverPath = `./server/${project}`;
  const fs = require("fs").promises;
  try {
    await fs.access(serverPath);
  } catch {
    return {
      valid: false,
      error: "Server not found",
      status: 404,
    };
  }

  return { valid: true };
}

/**
 * Stop server if it's currently running
 */
async function stopServerIfRunning(project: string): Promise<void> {
  const serverProcess = runningServers.get(project);
  if (serverProcess && !serverProcess.killed) {
    logger.info(`Stopping running server ${project} before deletion...`);
    serverProcess.kill();
    runningServers.delete(project);

    // Wait a moment for the process to fully terminate
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * Remove server files from disk
 */
async function removeServerFiles(project: string): Promise<void> {
  const serverPath = `./server/${project}`;
  const fs = require("fs").promises;

  logger.info(`Deleting server directory: ${serverPath}`);
  await fs.rm(serverPath, { recursive: true, force: true });
}

/**
 * Delete a server instance
 * DELETE /api/server/delete
 */
export async function deleteServerInstance(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const project = url.searchParams.get("project");

    // Validate deletion request
    const validation = await validateDeletion(project);
    if (!validation.valid) {
      return Response.json(
        {
          success: false,
          error: validation.error,
        },
        { status: validation.status || 400 }
      );
    }

    // Stop server if running
    await stopServerIfRunning(project!);

    // Remove server files
    await removeServerFiles(project!);

    return Response.json({
      success: true,
      message: `Server ${project} deleted successfully`,
    });
  } catch (error) {
    logger.error("Error deleting server:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

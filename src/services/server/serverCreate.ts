/**
 * Server creation functionality
 */

import AdmZip from "adm-zip";
import type { CreateServerData, ServerResult } from "./server.types";
import {
  validateCustomName,
  validateDescription,
  writeMetadata,
} from "../metadataService";
import {
  fileExists,
  writeServerFile,
  deleteServerDirectory,
  getServerPath,
  getServerFilePath,
} from "./serverRepository";
import { logger } from "@/lib/logger";

/**
 * Generate date string in yyyy-mm-dd format
 */
function generateDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Validate server creation data
 */
async function validateServerCreation(
  data: CreateServerData
): Promise<{ valid: boolean; error?: string }> {
  if (data.customName) {
    const nameValidation = validateCustomName(data.customName);
    if (!nameValidation.valid) {
      return { valid: false, error: nameValidation.error };
    }
  }

  if (data.description) {
    const descValidation = validateDescription(data.description);
    if (!descValidation.valid) {
      return { valid: false, error: descValidation.error };
    }
  }

  return { valid: true };
}

/**
 * Setup server directory
 */
async function setupServerDirectory(
  dateString: string
): Promise<{ serverPath: string; exists: boolean }> {
  const serverPath = getServerPath(dateString);
  const createdFile = `${serverPath}/.created`;
  const exists = await fileExists(createdFile);

  if (!exists) {
    await writeServerFile(`${serverPath}/.gitkeep`, "");
  }

  return { serverPath, exists };
}

/**
 * Extract server files from ZIP
 */
async function extractServerFiles(
  zipFilePath: string,
  serverPath: string
): Promise<void> {
  logger.info(`Extracting ZIP file: ${zipFilePath}`);
  logger.info(`Target directory: ${serverPath}`);

  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(serverPath, true);

  logger.info("ZIP extraction completed");
}

/**
 * Create server metadata
 */
async function createServerMetadata(
  dateString: string,
  serverPath: string,
  data: CreateServerData,
  zipFileName: string
): Promise<void> {
  const createdTimestamp = new Date().toISOString();
  await writeServerFile(`${serverPath}/.created`, createdTimestamp);

  const finalCustomName = data.customName?.trim() || dateString;
  const metadata = {
    customName: finalCustomName,
    description: data.description?.trim() || "",
    createdAt: createdTimestamp,
    lastModified: createdTimestamp,
    sourceZipFile: zipFileName,
  };

  await writeMetadata(dateString, metadata);
}

/**
 * Cleanup temporary files on failure
 */
async function cleanupTempFiles(serverPath: string): Promise<void> {
  try {
    await deleteServerDirectory(serverPath);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Create a new server from ZIP file
 */
export async function createServer(
  data: CreateServerData
): Promise<ServerResult> {
  const validation = await validateServerCreation(data);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || "Validation failed",
    };
  }

  const dateString = generateDateString();
  const { serverPath, exists } = await setupServerDirectory(dateString);

  if (exists) {
    return {
      success: false,
      message: "Server for this date already exists",
      serverPath: dateString,
    };
  }

  const zipFileName = data.serverFile || "ServerFiles-4.14.zip";
  const zipFilePath = getServerFilePath(zipFileName);
  const zipExists = await fileExists(zipFilePath);

  if (!zipExists) {
    return {
      success: false,
      message: `Server file not found: ${zipFileName}`,
    };
  }

  try {
    await extractServerFiles(zipFilePath, serverPath);
    await createServerMetadata(dateString, serverPath, data, zipFileName);

    return {
      success: true,
      message: "Server created successfully",
      serverPath: dateString,
      createdAt: new Date().toISOString(),
      usedServerFile: zipFileName,
    };
  } catch (error) {
    await cleanupTempFiles(serverPath);
    return {
      success: false,
      message: "Failed to extract server files",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

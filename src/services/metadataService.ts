import { join } from "path";
import type { ServerMetadata } from "./types";
import { logger } from "@/lib/logger";

const METADATA_FILENAME = ".metadata.json";
const CREATED_FILENAME = ".created";
const SERVER_BASE_PATH = "./server";

/**
 * Validation rules for custom names
 */
export function validateCustomName(name: string): {
  valid: boolean;
  error?: string;
} {
  // Empty name is valid - will use fallback (date)
  if (!name || name.trim().length === 0) {
    return { valid: true };
  }

  if (name.length > 100) {
    return {
      valid: false,
      error: "Custom name must be 100 characters or less",
    };
  }

  // Allow more characters including dots, parentheses, etc. for server names
  const validNameRegex = /^[a-zA-Z0-9\s\-_.,()]+$/;
  if (!validNameRegex.test(name)) {
    return {
      valid: false,
      error:
        "Custom name can only contain letters, numbers, spaces, and common punctuation (.-_,())",
    };
  }

  return { valid: true };
}

/**
 * Validation rules for descriptions
 */
export function validateDescription(description: string): {
  valid: boolean;
  error?: string;
} {
  if (description.length > 500) {
    return {
      valid: false,
      error: "Description must be 500 characters or less",
    };
  }

  return { valid: true };
}

/**
 * Read metadata from a server directory
 */
export async function readMetadata(
  projectPath: string
): Promise<ServerMetadata | null> {
  try {
    const metadataPath = join(SERVER_BASE_PATH, projectPath, METADATA_FILENAME);
    const file = Bun.file(metadataPath);

    if (!(await file.exists())) {
      return null;
    }

    const content = await file.text();
    const metadata = JSON.parse(content) as ServerMetadata;

    return metadata;
  } catch (error) {
    logger.error(`Error reading metadata for ${projectPath}:`, error);
    return null;
  }
}

/**
 * Write metadata to a server directory
 */
export async function writeMetadata(
  projectPath: string,
  metadata: ServerMetadata
): Promise<void> {
  try {
    const metadataPath = join(SERVER_BASE_PATH, projectPath, METADATA_FILENAME);
    const content = JSON.stringify(metadata, null, 2);

    await Bun.write(metadataPath, content);
  } catch (error) {
    logger.error(`Error writing metadata for ${projectPath}:`, error);
    throw new Error(`Failed to write metadata: ${error}`);
  }
}

/**
 * Update specific fields in metadata
 */
export async function updateMetadata(
  projectPath: string,
  updates: Partial<ServerMetadata>
): Promise<void> {
  try {
    const existingMetadata = await readMetadata(projectPath);

    if (!existingMetadata) {
      throw new Error("Metadata file not found");
    }

    const updatedMetadata: ServerMetadata = {
      ...existingMetadata,
      ...updates,
      lastModified: new Date().toISOString(),
    };

    await writeMetadata(projectPath, updatedMetadata);
  } catch (error) {
    logger.error(`Error updating metadata for ${projectPath}:`, error);
    throw new Error(`Failed to update metadata: ${error}`);
  }
}

/**
 * Migrate a server directory without metadata to create default metadata
 */
export async function migrateMetadata(
  projectPath: string
): Promise<ServerMetadata> {
  try {
    logger.info(`Migrating metadata for ${projectPath}`);

    // Try to read creation timestamp from .created file
    let createdAt = new Date().toISOString();
    try {
      const createdFilePath = join(
        SERVER_BASE_PATH,
        projectPath,
        CREATED_FILENAME
      );
      const createdFile = Bun.file(createdFilePath);

      if (await createdFile.exists()) {
        const createdContent = await createdFile.text();
        createdAt = createdContent.trim();
      }
    } catch (error) {
      logger.warn(`Could not read .created file for ${projectPath}:`, error);
    }

    // Create default metadata
    const metadata: ServerMetadata = {
      customName: projectPath, // Use directory name as default
      description: "",
      createdAt,
      lastModified: new Date().toISOString(),
      sourceZipFile: "Unknown (migrated)",
    };

    // Write the metadata file
    await writeMetadata(projectPath, metadata);

    logger.info(`Successfully migrated metadata for ${projectPath}`);
    return metadata;
  } catch (error) {
    logger.error(`Error migrating metadata for ${projectPath}:`, error);
    throw new Error(`Failed to migrate metadata: ${error}`);
  }
}

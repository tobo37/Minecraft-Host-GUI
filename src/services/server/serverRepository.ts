/**
 * Repository layer for server file system operations
 * Isolates all file system access from business logic
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Read directory contents
 */
export async function readServerDirectory(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    throw new Error(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if path is a directory
 */
export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write file content
 */
export async function writeServerFile(filePath: string, content: string): Promise<void> {
  try {
    await Bun.write(filePath, content);
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete directory recursively
 */
export async function deleteServerDirectory(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    throw new Error(`Failed to delete directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create directory (with parents if needed)
 */
export async function createDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get server base directory path
 */
export function getServerBasePath(): string {
  return './server';
}

/**
 * Get server path for a specific server
 */
export function getServerPath(serverName: string): string {
  return path.join(getServerBasePath(), serverName);
}

/**
 * Get actual project path (includes projectPath if set in metadata)
 */
export function getActualServerPath(serverName: string, projectPath?: string): string {
  const basePath = getServerPath(serverName);
  return projectPath ? path.join(basePath, projectPath) : basePath;
}

/**
 * Get serverfiles base directory path
 */
export function getServerFilesBasePath(): string {
  return './serverfiles';
}

/**
 * Get full path for a server file
 */
export function getServerFilePath(fileName: string): string {
  return path.join(getServerFilesBasePath(), fileName);
}

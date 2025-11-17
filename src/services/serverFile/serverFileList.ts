import type { ServerFile } from './serverFile.types';
import { logger } from '@/lib/logger';
import type { promises as fsPromises } from 'fs';

/**
 * Process a single file entry
 */
async function processFileEntry(
  entry: string,
  serverFilesDir: string,
  fs: typeof fsPromises
): Promise<ServerFile | null> {
  if (entry === '.gitkeep') return null;
  if (!entry.toLowerCase().endsWith('.zip')) return null;
  
  const filePath = `${serverFilesDir}/${entry}`;
  const stat = await fs.stat(filePath);
  
  if (!stat.isFile()) return null;
  
  return {
    name: entry,
    size: stat.size,
    uploadedAt: stat.mtime.toISOString()
  };
}

/**
 * Read and process all files in directory
 */
async function readServerFilesDirectory(serverFilesDir: string, fs: typeof fsPromises): Promise<ServerFile[]> {
  const entries = await fs.readdir(serverFilesDir);
  const files: ServerFile[] = [];
  
  for (const entry of entries) {
    const file = await processFileEntry(entry, serverFilesDir, fs);
    if (file) {
      files.push(file);
    }
  }
  
  // Sort by upload date (newest first)
  files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  
  return files;
}

/**
 * List all server files in the serverfiles directory
 */
export async function listServerFiles(): Promise<Response> {
  try {
    const serverFilesDir = './serverfiles';
    const fs = require('fs').promises;
    
    try {
      const files = await readServerFilesDirectory(serverFilesDir, fs);
      return Response.json({
        success: true,
        files
      });
    } catch (_error) {
      return Response.json({
        success: true,
        files: []
      });
    }
  } catch (error) {
    logger.error('Error listing server files:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Delete a server file
 */
export async function deleteServerFile(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filename = url.searchParams.get('filename');
    
    if (!filename) {
      return Response.json({
        success: false,
        error: "Filename parameter is required"
      }, { status: 400 });
    }
    
    // Security check: only allow deletion of .zip files
    if (!filename.toLowerCase().endsWith('.zip')) {
      return Response.json({
        success: false,
        error: "Only ZIP files can be deleted"
      }, { status: 400 });
    }
    
    const filePath = `./serverfiles/${filename}`;
    const fs = require('fs').promises;
    
    try {
      await fs.unlink(filePath);
      return Response.json({
        success: true,
        message: "File deleted successfully"
      });
    } catch (_error) {
      return Response.json({
        success: false,
        error: "File not found or cannot be deleted"
      }, { status: 404 });
    }
    
  } catch (error) {
    logger.error('Error deleting server file:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

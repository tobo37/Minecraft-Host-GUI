import type { ServerFile } from './serverFile.types';

/**
 * List all server files in the serverfiles directory
 */
export async function listServerFiles(): Promise<Response> {
  try {
    const serverFilesDir = './serverfiles';
    const fs = require('fs').promises;
    
    try {
      const entries = await fs.readdir(serverFilesDir);
      const files: ServerFile[] = [];
      
      for (const entry of entries) {
        if (entry === '.gitkeep') continue;
        if (!entry.toLowerCase().endsWith('.zip')) continue;
        
        const filePath = `${serverFilesDir}/${entry}`;
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          files.push({
            name: entry,
            size: stat.size,
            uploadedAt: stat.mtime.toISOString()
          });
        }
      }
      
      // Sort by upload date (newest first)
      files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
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
    console.error('Error listing server files:', error);
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
    console.error('Error deleting server file:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

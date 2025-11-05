import type { ServerFile, ApiResponse } from './types';

/**
 * Save a file using streaming to avoid memory issues with large files
 */
async function saveFileStream(file: File, filePath: string): Promise<void> {
  const fs = require('fs');
  const stream = fs.createWriteStream(filePath);
  
  return new Promise((resolve, reject) => {
    const reader = file.stream().getReader();
    let bytesWritten = 0;
    
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            stream.end();
            console.log(`Streaming complete: ${bytesWritten} bytes written`);
            resolve();
            break;
          }
          
          bytesWritten += value.length;
          
          // Write chunk to file
          if (!stream.write(Buffer.from(value))) {
            // Wait for drain event if buffer is full
            await new Promise(resolve => stream.once('drain', resolve));
          }
          
          // Log progress for very large files
          if (bytesWritten % (100 * 1024 * 1024) === 0) {
            console.log(`Streaming progress: ${Math.round(bytesWritten / 1024 / 1024)} MB written`);
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        stream.destroy();
        reject(error);
      }
    };
    
    stream.on('error', (error) => {
      console.error('Write stream error:', error);
      reject(error);
    });
    
    pump();
  });
}

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
    } catch (error) {
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
 * Upload a server file (ZIP format)
 */
export async function uploadServerFile(req: Request): Promise<Response> {
  try {
    console.log('Upload request received');
    
    // Parse form data with error handling
    let formData: FormData;
    try {
      formData = await req.formData();
      console.log('FormData parsed successfully');
    } catch (parseError) {
      console.error('Error parsing FormData:', parseError);
      return Response.json({
        success: false,
        error: "Failed to parse form data"
      }, { status: 400 });
    }
    
    const file = formData.get('serverfile') as File;
    
    if (!file) {
      console.log('No file found in formData');
      return Response.json({
        success: false,
        error: "No file provided"
      }, { status: 400 });
    }
    
    console.log(`File received: ${file.name}, size: ${file.size} bytes`);
    
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return Response.json({
        success: false,
        error: "Only ZIP files are allowed"
      }, { status: 400 });
    }
    
    // Check file size (limit to 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      return Response.json({
        success: false,
        error: "File too large. Maximum size is 2GB"
      }, { status: 400 });
    }
    
    const serverFilesDir = './serverfiles';
    const filePath = `${serverFilesDir}/${file.name}`;
    
    // Create serverfiles directory if it doesn't exist
    const fs = require('fs').promises;
    try {
      await fs.access(serverFilesDir);
    } catch {
      await fs.mkdir(serverFilesDir, { recursive: true });
    }
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      return Response.json({
        success: false,
        error: "File with this name already exists"
      }, { status: 409 });
    } catch {
      // File doesn't exist, which is what we want
    }
    
    // Save the file with streaming for large files
    console.log(`Saving file to: ${filePath}`);
    try {
      // Use streaming for files larger than 100MB to avoid memory issues
      if (file.size > 100 * 1024 * 1024) {
        console.log('Using streaming upload for large file...');
        await saveFileStream(file, filePath);
      } else {
        // Use regular method for smaller files
        const arrayBuffer = await file.arrayBuffer();
        await Bun.write(filePath, arrayBuffer);
      }
      console.log(`File saved successfully: ${file.name}`);
    } catch (saveError) {
      console.error('Error saving file:', saveError);
      return Response.json({
        success: false,
        error: "Failed to save file"
      }, { status: 500 });
    }
    
    return Response.json({
      success: true,
      message: "File uploaded successfully",
      filename: file.name,
      size: file.size
    });
    
  } catch (error) {
    console.error('Error uploading server file:', error);
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
    } catch (error) {
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
}/**

 * Handle chunked upload for very large files
 */
export async function uploadServerFileChunked(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const chunkIndex = parseInt(url.searchParams.get('chunk') || '0');
    const totalChunks = parseInt(url.searchParams.get('totalChunks') || '1');
    const fileName = url.searchParams.get('fileName');
    const fileSize = parseInt(url.searchParams.get('fileSize') || '0');
    
    if (!fileName) {
      return Response.json({
        success: false,
        error: "Filename is required"
      }, { status: 400 });
    }
    
    console.log(`Receiving chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`);
    
    const serverFilesDir = './serverfiles';
    const tempDir = `${serverFilesDir}/.temp`;
    const chunkPath = `${tempDir}/${fileName}.chunk.${chunkIndex}`;
    const finalPath = `${serverFilesDir}/${fileName}`;
    
    // Create directories
    const fs = require('fs').promises;
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch {}
    
    // Save chunk
    const arrayBuffer = await req.arrayBuffer();
    await Bun.write(chunkPath, arrayBuffer);
    
    // Check if all chunks are received
    const chunks = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkFile = `${tempDir}/${fileName}.chunk.${i}`;
      try {
        await fs.access(chunkFile);
        chunks.push(chunkFile);
      } catch {
        // Chunk not yet received
        return Response.json({
          success: true,
          message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
          completed: false
        });
      }
    }
    
    // All chunks received, combine them
    console.log(`All chunks received for ${fileName}, combining...`);
    
    const writeStream = require('fs').createWriteStream(finalPath);
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkFile = `${tempDir}/${fileName}.chunk.${i}`;
      const chunkData = await Bun.file(chunkFile).arrayBuffer();
      writeStream.write(Buffer.from(chunkData));
      
      // Clean up chunk file
      await fs.unlink(chunkFile);
    }
    
    writeStream.end();
    
    // Wait for write to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    console.log(`File ${fileName} assembled successfully`);
    
    return Response.json({
      success: true,
      message: "File uploaded successfully",
      filename: fileName,
      size: fileSize,
      completed: true
    });
    
  } catch (error) {
    console.error('Error in chunked upload:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
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
    
    stream.on('error', (error: any) => {
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
    } catch (error: any) {
      return Response.json({
        success: true,
        files: []
      });
    }
  } catch (error: any) {
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
    
  } catch (error: any) {
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
    } catch (error: any) {
      return Response.json({
        success: false,
        error: "File not found or cannot be deleted"
      }, { status: 404 });
    }
    
  } catch (error: any) {
    console.error('Error deleting server file:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
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
    
    console.log(`Receiving chunk ${chunkIndex + 1}/${totalChunks} for ${fileName} (${Math.round(((chunkIndex + 1) / totalChunks) * 100)}%)`);
    
    const serverFilesDir = './serverfiles';
    const tempDir = `${serverFilesDir}/.temp`;
    const chunkPath = `${tempDir}/${fileName}.chunk.${chunkIndex}`;
    const finalPath = `${serverFilesDir}/${fileName}`;
    
    // Create directories
    const fs = require('fs').promises;
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (mkdirError) {
      // Directory might already exist
    }
    
    // Check if file already exists (only on first chunk)
    if (chunkIndex === 0) {
      try {
        await fs.access(finalPath);
        return Response.json({
          success: false,
          error: "File with this name already exists"
        }, { status: 409 });
      } catch {
        // File doesn't exist, which is what we want
      }
    }
    
    // Save chunk
    try {
      const arrayBuffer = await req.arrayBuffer();
      console.log(`Chunk ${chunkIndex} size: ${arrayBuffer.byteLength} bytes`);
      await Bun.write(chunkPath, arrayBuffer);
      console.log(`Chunk ${chunkIndex + 1}/${totalChunks} saved successfully`);
    } catch (saveError) {
      console.error(`Error saving chunk ${chunkIndex}:`, saveError);
      return Response.json({
        success: false,
        error: `Failed to save chunk ${chunkIndex + 1}`
      }, { status: 500 });
    }
    
    // Check if this is the last chunk
    if (chunkIndex === totalChunks - 1) {
      console.log(`Last chunk received for ${fileName}, combining all chunks...`);
      
      try {
        // Combine all chunks
        const writeStream = require('fs').createWriteStream(finalPath);
        
        for (let i = 0; i < totalChunks; i++) {
          const chunkFile = `${tempDir}/${fileName}.chunk.${i}`;
          
          // Verify chunk exists
          try {
            await fs.access(chunkFile);
          } catch {
            throw new Error(`Missing chunk ${i + 1}/${totalChunks}`);
          }
          
          const chunkData = await Bun.file(chunkFile).arrayBuffer();
          writeStream.write(Buffer.from(chunkData));
          console.log(`Combined chunk ${i + 1}/${totalChunks}`);
        }
        
        writeStream.end();
        
        // Wait for write to complete
        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
        
        // Clean up chunk files
        for (let i = 0; i < totalChunks; i++) {
          const chunkFile = `${tempDir}/${fileName}.chunk.${i}`;
          try {
            await fs.unlink(chunkFile);
          } catch (cleanupError) {
            console.warn(`Failed to cleanup chunk ${i}:`, cleanupError);
          }
        }
        
        console.log(`File ${fileName} assembled successfully from ${totalChunks} chunks`);
        
        return Response.json({
          success: true,
          message: "File uploaded successfully",
          filename: fileName,
          size: fileSize,
          completed: true
        });
        
      } catch (combineError) {
        console.error('Error combining chunks:', combineError);
        return Response.json({
          success: false,
          error: `Failed to combine chunks: ${combineError instanceof Error ? combineError.message : 'Unknown error'}`
        }, { status: 500 });
      }
    } else {
      // Not the last chunk, just acknowledge receipt
      return Response.json({
        success: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
        completed: false,
        progress: Math.round(((chunkIndex + 1) / totalChunks) * 100)
      });
    }
    
  } catch (error: any) {
    console.error('Error in chunked upload:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}/**

 * Upload large files via raw stream (bypasses formData memory issues)
 */
export async function uploadServerFileStream(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const fileName = url.searchParams.get('fileName');
    const fileSize = parseInt(url.searchParams.get('fileSize') || '0');
    
    if (!fileName) {
      return Response.json({
        success: false,
        error: "Filename is required"
      }, { status: 400 });
    }
    
    if (!fileName.toLowerCase().endsWith('.zip')) {
      return Response.json({
        success: false,
        error: "Only ZIP files are allowed"
      }, { status: 400 });
    }
    
    // Check file size (limit to 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (fileSize > maxSize) {
      return Response.json({
        success: false,
        error: "File too large. Maximum size is 2GB"
      }, { status: 400 });
    }
    
    console.log(`Stream upload request: ${fileName}, size: ${fileSize} bytes`);
    
    const serverFilesDir = './serverfiles';
    const filePath = `${serverFilesDir}/${fileName}`;
    
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
    
    // Stream the request body directly to file
    console.log(`Starting stream upload to: ${filePath}`);
    
    const writeStream = require('fs').createWriteStream(filePath);
    let bytesWritten = 0;
    
    try {
      // Get the request body as a readable stream
      const reader = req.body?.getReader();
      
      if (!reader) {
        throw new Error('No request body stream available');
      }
      
      // Stream data directly from request to file
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        bytesWritten += value.length;
        
        // Write chunk to file
        if (!writeStream.write(Buffer.from(value))) {
          // Wait for drain event if buffer is full
          await new Promise(resolve => writeStream.once('drain', resolve));
        }
        
        // Log progress for large files
        if (bytesWritten % (100 * 1024 * 1024) === 0) {
          console.log(`Stream progress: ${Math.round(bytesWritten / 1024 / 1024)} MB written`);
        }
      }
      
      // Close the write stream
      writeStream.end();
      
      // Wait for write to complete
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      console.log(`Stream upload completed: ${fileName}, ${bytesWritten} bytes written`);
      
      // Verify file size matches expected
      const stat = await fs.stat(filePath);
      if (fileSize > 0 && stat.size !== fileSize) {
        console.warn(`File size mismatch: expected ${fileSize}, got ${stat.size}`);
      }
      
      return Response.json({
        success: true,
        message: "File uploaded successfully via stream",
        filename: fileName,
        size: stat.size
      });
      
    } catch (streamError) {
      console.error('Stream upload error:', streamError);
      
      // Clean up partial file on error
      try {
        writeStream.destroy();
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup partial file:', cleanupError);
      }
      
      return Response.json({
        success: false,
        error: `Stream upload failed: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Error in stream upload:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
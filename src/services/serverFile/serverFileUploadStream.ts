interface StreamParams {
  fileName: string;
  fileSize: number;
}

function parseStreamParams(url: URL): StreamParams {
  return {
    fileName: url.searchParams.get('fileName') || '',
    fileSize: parseInt(url.searchParams.get('fileSize') || '0')
  };
}

function validateStreamParams(params: StreamParams): string | null {
  if (!params.fileName) {
    return "Filename is required";
  }
  
  if (!params.fileName.toLowerCase().endsWith('.zip')) {
    return "Only ZIP files are allowed";
  }
  
  const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
  if (params.fileSize > maxSize) {
    return "File too large. Maximum size is 2GB";
  }
  
  return null;
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  const fs = require('fs').promises;
  try {
    await fs.access(dirPath);
  } catch (_error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function checkFileExists(filePath: string): Promise<boolean> {
  const fs = require('fs').promises;
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function streamToFile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reader: any,
  writeStream: NodeJS.WritableStream
): Promise<number> {
  let bytesWritten = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    bytesWritten += value.length;
    
    if (!writeStream.write(Buffer.from(value))) {
      await new Promise(resolve => writeStream.once('drain', resolve));
    }
    
    if (bytesWritten % (100 * 1024 * 1024) === 0) {
      console.log(`Stream progress: ${Math.round(bytesWritten / 1024 / 1024)} MB written`);
    }
  }
  
  return bytesWritten;
}

async function cleanupPartialFile(writeStream: NodeJS.WritableStream, filePath: string): Promise<void> {
  const fs = require('fs').promises;
  try {
    if ('destroy' in writeStream && typeof writeStream.destroy === 'function') {
      writeStream.destroy();
    }
    await fs.unlink(filePath);
  } catch (_error) {
    console.warn('Failed to cleanup partial file:', _error);
  }
}

/**
 * Upload large files via raw stream (bypasses formData memory issues)
 */
export async function uploadServerFileStream(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const params = parseStreamParams(url);
    
    const validationError = validateStreamParams(params);
    if (validationError) {
      return Response.json({
        success: false,
        error: validationError
      }, { status: 400 });
    }
    
    console.log(`Stream upload request: ${params.fileName}, size: ${params.fileSize} bytes`);
    
    const serverFilesDir = './serverfiles';
    const filePath = `${serverFilesDir}/${params.fileName}`;
    
    await ensureDirectoryExists(serverFilesDir);
    
    if (await checkFileExists(filePath)) {
      return Response.json({
        success: false,
        error: "File with this name already exists"
      }, { status: 409 });
    }
    
    console.log(`Starting stream upload to: ${filePath}`);
    
    const writeStream = require('fs').createWriteStream(filePath);
    
    try {
      const reader = req.body?.getReader();
      
      if (!reader) {
        throw new Error('No request body stream available');
      }
      
      const bytesWritten = await streamToFile(reader, writeStream);
      
      writeStream.end();
      
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      console.log(`Stream upload completed: ${params.fileName}, ${bytesWritten} bytes written`);
      
      const fs = require('fs').promises;
      const stat = await fs.stat(filePath);
      if (params.fileSize > 0 && stat.size !== params.fileSize) {
        console.warn(`File size mismatch: expected ${params.fileSize}, got ${stat.size}`);
      }
      
      return Response.json({
        success: true,
        message: "File uploaded successfully via stream",
        filename: params.fileName,
        size: stat.size
      });
      
    } catch (streamError) {
      console.error('Stream upload error:', streamError);
      await cleanupPartialFile(writeStream, filePath);
      
      return Response.json({
        success: false,
        error: `Stream upload failed: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in stream upload:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

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
          
          if (!stream.write(Buffer.from(value))) {
            await new Promise(resolve => stream.once('drain', resolve));
          }
          
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
    
    stream.on('error', (error: Error) => {
      console.error('Write stream error:', error);
      reject(error);
    });
    
    pump();
  });
}

async function validateUploadRequest(formData: FormData): Promise<{ file: File; error?: string }> {
  const file = formData.get('serverfile') as File;
  
  if (!file) {
    return { file: null as unknown as File, error: "No file provided" };
  }
  
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return { file, error: "Only ZIP files are allowed" };
  }
  
  const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
  if (file.size > maxSize) {
    return { file, error: "File too large. Maximum size is 2GB" };
  }
  
  return { file };
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

async function saveFile(file: File, filePath: string): Promise<void> {
  if (file.size > 100 * 1024 * 1024) {
    console.log('Using streaming upload for large file...');
    await saveFileStream(file, filePath);
  } else {
    const arrayBuffer = await file.arrayBuffer();
    await Bun.write(filePath, arrayBuffer);
  }
}

/**
 * Upload a server file (ZIP format)
 */
export async function uploadServerFile(req: Request): Promise<Response> {
  try {
    console.log('Upload request received');
    
    let formData: FormData;
    try {
      formData = await req.formData();
      console.log('FormData parsed successfully');
    } catch (_parseError) {
      console.error('Error parsing FormData:', _parseError);
      return Response.json({
        success: false,
        error: "Failed to parse form data"
      }, { status: 400 });
    }
    
    const { file, error: validationError } = await validateUploadRequest(formData);
    if (validationError) {
      return Response.json({
        success: false,
        error: validationError
      }, { status: 400 });
    }
    
    console.log(`File received: ${file.name}, size: ${file.size} bytes`);
    
    const serverFilesDir = './serverfiles';
    const filePath = `${serverFilesDir}/${file.name}`;
    
    await ensureDirectoryExists(serverFilesDir);
    
    if (await checkFileExists(filePath)) {
      return Response.json({
        success: false,
        error: "File with this name already exists"
      }, { status: 409 });
    }
    
    console.log(`Saving file to: ${filePath}`);
    try {
      await saveFile(file, filePath);
      console.log(`File saved successfully: ${file.name}`);
    } catch (_saveError) {
      console.error('Error saving file:', _saveError);
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

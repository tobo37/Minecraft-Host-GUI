import { logger } from "@/lib/logger";

interface ChunkParams {
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  fileSize: number;
}

function parseChunkParams(url: URL): ChunkParams {
  return {
    chunkIndex: parseInt(url.searchParams.get("chunk") || "0"),
    totalChunks: parseInt(url.searchParams.get("totalChunks") || "1"),
    fileName: url.searchParams.get("fileName") || "",
    fileSize: parseInt(url.searchParams.get("fileSize") || "0"),
  };
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  const fs = require("fs").promises;
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (_error) {
    // Directory might already exist
  }
}

async function checkFileExists(filePath: string): Promise<boolean> {
  const fs = require("fs").promises;
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function saveChunk(chunkPath: string, data: ArrayBuffer): Promise<void> {
  await Bun.write(chunkPath, data);
}

async function combineChunks(
  tempDir: string,
  fileName: string,
  totalChunks: number,
  finalPath: string
): Promise<void> {
  const writeStream = require("fs").createWriteStream(finalPath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkFile = `${tempDir}/${fileName}.chunk.${i}`;

    if (!(await checkFileExists(chunkFile))) {
      throw new Error(`Missing chunk ${i + 1}/${totalChunks}`);
    }

    const chunkData = await Bun.file(chunkFile).arrayBuffer();
    writeStream.write(Buffer.from(chunkData));
    logger.info(`Combined chunk ${i + 1}/${totalChunks}`);
  }

  writeStream.end();

  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

async function cleanupChunks(
  tempDir: string,
  fileName: string,
  totalChunks: number
): Promise<void> {
  const fs = require("fs").promises;

  for (let i = 0; i < totalChunks; i++) {
    const chunkFile = `${tempDir}/${fileName}.chunk.${i}`;
    try {
      await fs.unlink(chunkFile);
    } catch (_error) {
      logger.warn(`Failed to cleanup chunk ${i}:`, _error);
    }
  }
}

/**
 * Handle chunked upload for very large files
 */
export async function uploadServerFileChunked(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const { chunkIndex, totalChunks, fileName, fileSize } = parseChunkParams(url);

    if (!fileName) {
      return Response.json(
        {
          success: false,
          error: "Filename is required",
        },
        { status: 400 }
      );
    }

    logger.info(
      `Receiving chunk ${chunkIndex + 1}/${totalChunks} for ${fileName} (${Math.round(((chunkIndex + 1) / totalChunks) * 100)}%)`
    );

    const serverFilesDir = "./serverfiles";
    const tempDir = `${serverFilesDir}/.temp`;
    const chunkPath = `${tempDir}/${fileName}.chunk.${chunkIndex}`;
    const finalPath = `${serverFilesDir}/${fileName}`;

    await ensureDirectoryExists(tempDir);

    // Check if file already exists (only on first chunk)
    if (chunkIndex === 0 && (await checkFileExists(finalPath))) {
      return Response.json(
        {
          success: false,
          error: "File with this name already exists",
        },
        { status: 409 }
      );
    }

    // Save chunk
    try {
      const arrayBuffer = await req.arrayBuffer();
      logger.info(`Chunk ${chunkIndex} size: ${arrayBuffer.byteLength} bytes`);
      await saveChunk(chunkPath, arrayBuffer);
      logger.info(`Chunk ${chunkIndex + 1}/${totalChunks} saved successfully`);
    } catch (_error) {
      logger.error(`Error saving chunk ${chunkIndex}:`, _error);
      return Response.json(
        {
          success: false,
          error: `Failed to save chunk ${chunkIndex + 1}`,
        },
        { status: 500 }
      );
    }

    // Check if this is the last chunk
    if (chunkIndex === totalChunks - 1) {
      logger.info(`Last chunk received for ${fileName}, combining all chunks...`);

      try {
        await combineChunks(tempDir, fileName, totalChunks, finalPath);
        await cleanupChunks(tempDir, fileName, totalChunks);

        logger.info(`File ${fileName} assembled successfully from ${totalChunks} chunks`);

        return Response.json({
          success: true,
          message: "File uploaded successfully",
          filename: fileName,
          size: fileSize,
          completed: true,
        });
      } catch (combineError) {
        logger.error("Error combining chunks:", combineError);
        return Response.json(
          {
            success: false,
            error: `Failed to combine chunks: ${combineError instanceof Error ? combineError.message : "Unknown error"}`,
          },
          { status: 500 }
        );
      }
    }

    // Not the last chunk, just acknowledge receipt
    return Response.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
      completed: false,
      progress: Math.round(((chunkIndex + 1) / totalChunks) * 100),
    });
  } catch (error) {
    logger.error("Error in chunked upload:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

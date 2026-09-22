import { logger } from "@/lib/logger";
import {
  ensureDirectoryExists,
  checkFileExists,
  cleanupPartialFile,
  verifyUploadedFile,
  streamToFile,
} from "./serverFileUtils";

interface StreamParams {
  fileName: string;
  fileSize: number;
}

function parseStreamParams(url: URL): StreamParams {
  return {
    fileName: url.searchParams.get("fileName") || "",
    fileSize: parseInt(url.searchParams.get("fileSize") || "0"),
  };
}

function validateStreamParams(params: StreamParams): string | null {
  if (!params.fileName) {
    return "Filename is required";
  }

  if (!params.fileName.toLowerCase().endsWith(".zip")) {
    return "Only ZIP files are allowed";
  }

  const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
  if (params.fileSize > maxSize) {
    return "File too large. Maximum size is 2GB";
  }

  return null;
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
      return Response.json(
        {
          success: false,
          error: validationError,
        },
        { status: 400 }
      );
    }

    logger.info(`Stream upload request: ${params.fileName}, size: ${params.fileSize} bytes`);

    const serverFilesDir = "./serverfiles";
    const filePath = `${serverFilesDir}/${params.fileName}`;

    await ensureDirectoryExists(serverFilesDir);

    if (await checkFileExists(filePath)) {
      return Response.json(
        {
          success: false,
          error: "File with this name already exists",
        },
        { status: 409 }
      );
    }

    logger.info(`Starting stream upload to: ${filePath}`);

    const writeStream = require("fs").createWriteStream(filePath);

    try {
      const reader = req.body?.getReader();

      if (!reader) {
        throw new Error("No request body stream available");
      }

      await streamToFile(reader, writeStream);

      writeStream.end();

      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      const stat = await verifyUploadedFile(filePath, params.fileSize, params.fileName);

      return Response.json({
        success: true,
        message: "File uploaded successfully via stream",
        filename: params.fileName,
        size: stat.size,
      });
    } catch (streamError) {
      logger.error("Stream upload error:", streamError);
      await cleanupPartialFile(writeStream, filePath);

      return Response.json(
        {
          success: false,
          error: `Stream upload failed: ${streamError instanceof Error ? streamError.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Error in stream upload:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

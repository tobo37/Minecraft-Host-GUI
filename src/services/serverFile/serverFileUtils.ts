import { logger } from "@/lib/logger";

/**
 * Shared disk helpers for anything that lands a file in ./serverfiles,
 * whether it arrives via form upload, raw stream upload, or URL download.
 */

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  const fs = require("fs").promises;
  try {
    await fs.access(dirPath);
  } catch (_error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function checkFileExists(filePath: string): Promise<boolean> {
  const fs = require("fs").promises;
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

export async function cleanupPartialFile(
  writeStream: NodeJS.WritableStream,
  filePath: string
): Promise<void> {
  const fs = require("fs").promises;
  try {
    if ("destroy" in writeStream && typeof writeStream.destroy === "function") {
      writeStream.destroy();
    }
    await fs.unlink(filePath);
  } catch (_error) {
    logger.warn("Failed to cleanup partial file:", _error);
  }
}

export async function verifyUploadedFile(
  filePath: string,
  expectedSize: number,
  fileName: string
): Promise<{ size: number }> {
  const fs = require("fs").promises;
  const stat = await fs.stat(filePath);

  if (expectedSize > 0 && stat.size !== expectedSize) {
    logger.warn(`File size mismatch: expected ${expectedSize}, got ${stat.size}`);
  }

  logger.info(`Upload completed: ${fileName}, ${stat.size} bytes written`);
  return stat;
}

/**
 * Pump a ReadableStream reader into a Node writable stream, honoring backpressure.
 */
export async function streamToFile(
  reader: globalThis.ReadableStreamDefaultReader<Uint8Array>,
  writeStream: NodeJS.WritableStream
): Promise<number> {
  let bytesWritten = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    bytesWritten += value.length;

    if (!writeStream.write(Buffer.from(value))) {
      await new Promise((resolve) => writeStream.once("drain", resolve));
    }

    if (bytesWritten % (100 * 1024 * 1024) === 0) {
      logger.info(`Stream progress: ${Math.round(bytesWritten / 1024 / 1024)} MB written`);
    }
  }

  return bytesWritten;
}

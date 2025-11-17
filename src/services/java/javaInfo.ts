import { $ } from "bun";
import { logger } from "@/lib/logger";

export interface JavaInfo {
  installed: boolean;
  version?: string;
  path?: string;
}

/**
 * Get Java installation information
 */
export async function getJavaInfo(): Promise<JavaInfo> {
  try {
    const result = await $`java -version`.quiet().nothrow();

    if (result.exitCode === 0) {
      const output = result.stderr.toString();
      const versionMatch = output.match(/version "(.+?)"/);
      const version = versionMatch ? versionMatch[1] : "Unknown";

      const isWindows = process.platform === "win32";
      const pathCommand = isWindows ? "where" : "which";
      const pathResult = await $`${pathCommand} java`.quiet().nothrow();
      const path =
        pathResult.exitCode === 0 ? pathResult.stdout.toString().trim().split("\n")[0] : undefined;

      return {
        installed: true,
        version,
        path,
      };
    }

    return { installed: false };
  } catch (error) {
    logger.error("Error checking Java:", error);
    return { installed: false };
  }
}

import { logger } from "@/lib/logger";
import { getJabbaPath, execJabba, parseJabbaVersions, isDockerEnvironment } from "./jabbaUtils";

export interface JabbaInfo {
  installed: boolean;
  versions?: string[];
  current?: string;
  isDockerEnvironment?: boolean;
}

/**
 * Get installed Jabba versions
 */
async function getInstalledVersions(): Promise<{
  versions: string[];
  current?: string;
}> {
  const listResult = await execJabba(["ls"]);

  if (listResult.exitCode !== 0) {
    return { versions: [] };
  }

  return parseJabbaVersions(listResult.stdout);
}

/**
 * Get Jabba installation information
 */
export async function getJabbaInfo(): Promise<JabbaInfo> {
  const inDocker = isDockerEnvironment();

  try {
    const jabbaPath = getJabbaPath();
    const fileExists = await Bun.file(jabbaPath).exists();

    if (!fileExists) {
      logger.info(`Jabba not found at ${jabbaPath}. Docker environment: ${inDocker}`);
      return {
        installed: false,
        isDockerEnvironment: inDocker,
      };
    }

    const jabbaCheck = await execJabba(["--version"]);

    if (jabbaCheck.exitCode !== 0) {
      logger.warn(
        `Jabba executable found but version check failed. Exit code: ${jabbaCheck.exitCode}`
      );
      return {
        installed: false,
        isDockerEnvironment: inDocker,
      };
    }

    const { versions, current } = await getInstalledVersions();

    logger.info(
      `Jabba is installed with ${versions.length} version(s). Current: ${current || "none"}`
    );
    return {
      installed: true,
      versions,
      current,
      isDockerEnvironment: inDocker,
    };
  } catch (error) {
    logger.error("Error checking Jabba:", error);
    return {
      installed: false,
      isDockerEnvironment: inDocker,
    };
  }
}

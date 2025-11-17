import { logger } from "@/lib/logger";
import { execJabba, getJabbaEnv, parseJabbaVersions } from "./jabbaUtils";

/**
 * Get available Java versions from Jabba
 */
export async function getAvailableVersions(): Promise<{
  success: boolean;
  versions?: string[];
  error?: string;
}> {
  try {
    logger.info("Fetching available Java versions from Jabba");
    const result = await execJabba(["ls-remote"]);

    if (result.exitCode === 0) {
      const versions = result.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      logger.info(`Found ${versions.length} available versions`);
      return { success: true, versions };
    }

    logger.error(`Failed to get available versions: ${result.stderr}`);
    return {
      success: false,
      error: `Failed to get available versions. ${result.stderr}`,
    };
  } catch (error) {
    logger.error("Error getting available versions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate Java version format
 */
function validateVersionFormat(version: string): {
  valid: boolean;
  error?: string;
} {
  if (!version || version.trim().length === 0) {
    return { valid: false, error: "Version cannot be empty" };
  }

  // Jabba version format: provider@version (e.g., openjdk@1.17.0, adopt@1.11.0-11)
  const versionPattern = /^[a-zA-Z0-9_-]+@[0-9.]+(-[a-zA-Z0-9_.-]+)?$/;

  if (!versionPattern.test(version)) {
    return {
      valid: false,
      error: `Invalid version format: ${version}. Expected format: provider@version (e.g., openjdk@1.17.0)`,
    };
  }

  return { valid: true };
}

/**
 * Check if a Java version is already installed
 */
async function isVersionInstalled(version: string): Promise<boolean> {
  try {
    const result = await execJabba(["ls"]);

    if (result.exitCode !== 0) {
      return false;
    }

    const { versions } = parseJabbaVersions(result.stdout);
    return versions.includes(version);
  } catch (error) {
    logger.error("Error checking installed versions:", error);
    return false;
  }
}

/**
 * Install a Java version using Jabba
 */
export async function installJabbaVersion(version: string): Promise<{
  success: boolean;
  error?: string;
  alreadyInstalled?: boolean;
}> {
  try {
    logger.info(`Starting installation process for Java version: ${version}`);

    // Validate version format
    const validation = validateVersionFormat(version);
    if (!validation.valid) {
      logger.error(`Version validation failed: ${validation.error}`);
      return {
        success: false,
        error: validation.error,
      };
    }

    // Check if version is already installed
    const installed = await isVersionInstalled(version);
    if (installed) {
      logger.info(`Java version ${version} is already installed, skipping installation`);
      return {
        success: true,
        alreadyInstalled: true,
      };
    }

    logger.info(`Installing Java version ${version}...`);
    const result = await execJabba(["install", version]);

    if (result.exitCode === 0) {
      logger.info(`Successfully installed Java version ${version}`);

      // Verify installation by checking if directory exists
      const verifyInstalled = await isVersionInstalled(version);
      if (!verifyInstalled) {
        const errorMessage = `Installation command succeeded but version ${version} is not available. The version may not exist in Jabba repositories.`;
        logger.error(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }

      return { success: true, alreadyInstalled: false };
    }

    const errorMessage = `Failed to install version ${version}. ${result.stderr || result.stdout}`;
    logger.error(errorMessage);
    logger.error(`Exit code: ${result.exitCode}`);
    return {
      success: false,
      error: errorMessage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error installing Java version ${version}:`, error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Switch Java version using Jabba and update process environment
 */
export async function setJabbaVersion(
  version: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Starting switch to Java version: ${version}`);

    // Validate version format
    const validation = validateVersionFormat(version);
    if (!validation.valid) {
      logger.error(`Version validation failed: ${validation.error}`);
      return {
        success: false,
        error: validation.error,
      };
    }

    // Check if version is installed
    const installed = await isVersionInstalled(version);
    if (!installed) {
      const errorMessage = `Java version ${version} is not installed. Please install it first.`;
      logger.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    logger.info(`Switching to Java version ${version}...`);
    const result = await execJabba(["use", version]);

    if (result.exitCode === 0) {
      const jabbaEnv = await getJabbaEnv(version);
      process.env.JAVA_HOME = jabbaEnv.JAVA_HOME;
      process.env.PATH = jabbaEnv.PATH;

      logger.info(`Successfully switched to Java version ${version}`);
      logger.info(`Updated environment: JAVA_HOME=${jabbaEnv.JAVA_HOME}`);

      return { success: true };
    }

    const errorMessage = `Failed to switch to version ${version}. ${result.stderr}`;
    logger.error(errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error switching Java version ${version}:`, error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

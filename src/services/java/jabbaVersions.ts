import { logger } from "@/lib/logger";
import { execJabba, getJabbaEnv } from "./jabbaUtils";

/**
 * Get available Java versions from Jabba
 */
export async function getAvailableVersions(): Promise<{ success: boolean; versions?: string[]; error?: string }> {
  try {
    const result = await execJabba(['ls-remote']);

    if (result.exitCode === 0) {
      const versions = result.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      return { success: true, versions };
    }

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
 * Install a Java version using Jabba
 */
export async function installJabbaVersion(version: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await execJabba(['install', version]);

    if (result.exitCode === 0) {
      return { success: true };
    }

    return {
      success: false,
      error: `Failed to install version ${version}. ${result.stderr}`,
    };
  } catch (error) {
    logger.error("Error installing Java version:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Switch Java version using Jabba and update process environment
 */
export async function setJabbaVersion(version: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await execJabba(['use', version]);

    if (result.exitCode === 0) {
      const jabbaEnv = await getJabbaEnv(version);
      process.env.JAVA_HOME = jabbaEnv.JAVA_HOME;
      process.env.PATH = jabbaEnv.PATH;
      
      logger.info(`Updated environment: JAVA_HOME=${jabbaEnv.JAVA_HOME}`);
      
      return { success: true };
    }

    return {
      success: false,
      error: `Failed to switch to version ${version}. ${result.stderr}`,
    };
  } catch (error) {
    logger.error("Error switching Java version:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

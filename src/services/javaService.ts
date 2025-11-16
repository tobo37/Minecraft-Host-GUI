import { logger } from "@/lib/logger";
import { getJavaInfo } from "./java/javaInfo";
import { getJabbaInfo } from "./java/jabbaInfo";
import { installJabba } from "./java/jabbaInstall";
import { getAvailableVersions, installJabbaVersion, setJabbaVersion } from "./java/jabbaVersions";
import { getJabbaEnv } from "./java/jabbaUtils";

// Re-export types
export type { JavaInfo } from "./java/javaInfo";
export type { JabbaInfo } from "./java/jabbaInfo";

/**
 * Load Jabba environment if a version is currently selected
 */
export async function loadJabbaEnvironment(): Promise<void> {
  try {
    const jabbaInfo = await getJabbaInfo();
    
    if (jabbaInfo.installed && jabbaInfo.current) {
      const jabbaEnv = await getJabbaEnv(jabbaInfo.current);
      process.env.JAVA_HOME = jabbaEnv.JAVA_HOME;
      process.env.PATH = jabbaEnv.PATH;
      logger.info(`Loaded Jabba environment: ${jabbaInfo.current} (JAVA_HOME=${jabbaEnv.JAVA_HOME})`);
    }
  } catch (error) {
    logger.error("Error loading Jabba environment:", error);
  }
}

/**
 * API handler for Java info
 */
export async function handleJavaInfo(): Promise<Response> {
  const info = await getJavaInfo();
  return Response.json(info);
}

/**
 * API handler for Jabba info
 */
export async function handleJabbaInfo(): Promise<Response> {
  const info = await getJabbaInfo();
  return Response.json(info);
}

/**
 * API handler for Jabba installation
 */
export async function handleJabbaInstall(): Promise<Response> {
  const result = await installJabba();
  return Response.json(result);
}

/**
 * API handler for getting available versions
 */
export async function handleJabbaLsRemote(): Promise<Response> {
  const result = await getAvailableVersions();
  return Response.json(result);
}

/**
 * API handler for installing a Java version
 */
export async function handleJabbaInstallVersion(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { version } = body;

    if (!version) {
      return Response.json({
        success: false,
        error: "Version is required",
      });
    }

    const result = await installJabbaVersion(version);
    return Response.json(result);
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * API handler for switching Java version
 */
export async function handleJabbaUse(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { version } = body;

    if (!version) {
      return Response.json({
        success: false,
        error: "Version is required",
      });
    }

    const result = await setJabbaVersion(version);
    return Response.json(result);
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * RCON (Remote Console) service for Minecraft server management
 */

import { Rcon } from 'rcon-client';
import { readFile } from 'fs/promises';
import { readMetadata, writeMetadata } from '../metadataService';
import { getServerRuntimePath } from './serverRepository';
import { logger } from '@/lib/logger';

// Store active RCON connections
const rconConnections = new Map<string, Rcon>();

interface RconConfig {
  host: string;
  port: number;
  password: string;
}

/**
 * Read a single key from server.properties content
 */
function readProperty(content: string, key: string): string | undefined {
  const escapedKey = key.replace(/\./g, '\\.');
  const match = content.match(new RegExp(`^${escapedKey}=(.*)$`, 'm'));
  return match?.[1]?.trim();
}

/**
 * Get RCON configuration.
 * server.properties in the runtime folder is the source of truth, because that
 * is what the Minecraft server actually reads. Metadata only supplies the host.
 */
export async function getRconConfig(project: string): Promise<RconConfig | null> {
  try {
    const metadata = await readMetadata(project);
    const serverPath = getServerRuntimePath(project, metadata?.projectPath, metadata?.startFile);
    const content = await readFile(`${serverPath}/server.properties`, 'utf-8');

    const enabled = readProperty(content, 'enable-rcon') === 'true';
    const password = readProperty(content, 'rcon.password');
    if (!enabled || !password) {
      return null;
    }

    const port = parseInt(readProperty(content, 'rcon.port') || '', 10);
    return {
      host: metadata?.rcon?.host || 'localhost',
      port: Number.isNaN(port) ? 25575 : port,
      password,
    };
  } catch {
    return null;
  }
}

/**
 * Save RCON configuration to server metadata
 */
export async function saveRconConfig(
  project: string,
  config: RconConfig
): Promise<void> {
  const metadata = await readMetadata(project);
  await writeMetadata(project, {
    ...metadata,
    rcon: config,
  } as any);
}

/**
 * Enable RCON in server.properties
 */
export async function enableRconInProperties(
  project: string,
  port: number = 25575,
  password: string = 'minecraft'
): Promise<{ success: boolean; error?: string }> {
  try {
    const metadata = await readMetadata(project);
    const serverPath = getServerRuntimePath(project, metadata?.projectPath, metadata?.startFile);
    const propertiesPath = `${serverPath}/server.properties`;
    
    const fs = require('fs').promises;
    
    // Check if file exists
    try {
      await fs.access(propertiesPath);
    } catch {
      return { 
        success: false, 
        error: 'server.properties not found. Start the server once to generate it.' 
      };
    }
    
    // Read current properties
    let content = await fs.readFile(propertiesPath, 'utf-8');
    
    // Update or add RCON settings
    const updates = {
      'enable-rcon': 'true',
      'rcon.port': port.toString(),
      'rcon.password': password,
    };
    
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    }
    
    await fs.writeFile(propertiesPath, content, 'utf-8');
    
    // Save to metadata
    await saveRconConfig(project, {
      host: 'localhost',
      port,
      password,
    });
    
    return { success: true };
  } catch (error) {
    logger.error('Failed to enable RCON:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// The RCON listener only opens once the server has finished starting, which
// can take minutes for modpacks. Instead of giving up for the whole session
// after a few failures, just pause reconnect attempts briefly.
const lastConnectFailure = new Map<string, number>();
const RECONNECT_COOLDOWN_MS = 5000;
// Commands like save-all can take several seconds on large modpacks
const RCON_TIMEOUT_MS = 15000;

/**
 * Connect to RCON server
 */
export async function connectRcon(
  project: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already connected
    const existing = rconConnections.get(project);
    if (existing && existing.authenticated) {
      return { success: true };
    }

    const lastFailure = lastConnectFailure.get(project);
    if (lastFailure && Date.now() - lastFailure < RECONNECT_COOLDOWN_MS) {
      return { success: false, error: 'RCON not reachable yet' };
    }

    const config = await getRconConfig(project);

    // If no config, RCON is not enabled
    if (!config) {
      return {
        success: false,
        error: 'RCON not configured. Enable it first in the RCON management page.'
      };
    }

    const rcon = new Rcon({
      host: config.host,
      port: config.port,
      password: config.password,
      timeout: RCON_TIMEOUT_MS,
    });

    // Socket errors are emitted as events; without a listener they would crash the process
    rcon.on('error', (error) => {
      logger.warn(`RCON socket error for ${project}:`, error);
    });

    // Handle disconnect
    rcon.on('end', () => {
      if (rconConnections.get(project) === rcon) {
        rconConnections.delete(project);
      }
    });

    await rcon.connect();
    rconConnections.set(project, rcon);
    lastConnectFailure.delete(project);

    return { success: true };
  } catch (error) {
    const isFirstFailure = !lastConnectFailure.has(project);
    lastConnectFailure.set(project, Date.now());

    // Only log first failure to avoid spam
    if (isFirstFailure) {
      logger.warn(`RCON connection failed for ${project}, will use stdin fallback`);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'RCON not available'
    };
  }
}

/**
 * Reset RCON connection state (call when server restarts)
 */
export function resetRconState(project: string): void {
  lastConnectFailure.delete(project);
  disconnectRcon(project);
}

/**
 * Send command via RCON.
 * `notConnected` tells the caller the command never reached the server, so
 * retrying it over stdin cannot execute it twice.
 */
export async function sendRconCommand(
  project: string,
  command: string
): Promise<{ success: boolean; response?: string; error?: string; notConnected?: boolean }> {
  let rcon = rconConnections.get(project);

  // Auto-connect if not connected
  if (!rcon || !rcon.authenticated) {
    const connectResult = await connectRcon(project);
    rcon = rconConnections.get(project);
    if (!connectResult.success || !rcon) {
      return {
        success: false,
        notConnected: true,
        error: connectResult.error || 'RCON not available'
      };
    }
  }

  try {
    const response = await rcon.send(command);
    return { success: true, response };
  } catch (error) {
    logger.warn('RCON command failed:', error);

    // Drop the connection so the next command reconnects
    rconConnections.delete(project);
    rcon.end().catch(() => {});

    return {
      success: false,
      error: error instanceof Error ? error.message : 'RCON command failed'
    };
  }
}

/**
 * Disconnect RCON
 */
export async function disconnectRcon(project: string): Promise<void> {
  const rcon = rconConnections.get(project);
  if (rcon) {
    try {
      await rcon.end();
    } catch {
      // Ignore errors
    }
    rconConnections.delete(project);
  }
}

/**
 * Get available Minecraft commands for autocomplete
 */
export function getMinecraftCommands(): string[] {
  return [
    'help',
    'stop',
    'list',
    'say',
    'tell',
    'give',
    'tp',
    'teleport',
    'gamemode',
    'difficulty',
    'time',
    'weather',
    'seed',
    'whitelist',
    'ban',
    'pardon',
    'kick',
    'op',
    'deop',
    'save-all',
    'save-on',
    'save-off',
  ];
}

/**
 * RCON (Remote Console) service for Minecraft server management
 */

import { Rcon } from 'rcon-client';
import { readMetadata, writeMetadata } from '../metadataService';
import { getActualServerPath } from './serverRepository';
import { logger } from '@/lib/logger';

// Store active RCON connections
const rconConnections = new Map<string, Rcon>();

interface RconConfig {
  host: string;
  port: number;
  password: string;
}

/**
 * Get RCON configuration from server metadata
 */
async function getRconConfig(project: string): Promise<RconConfig | null> {
  try {
    const metadata = await readMetadata(project);
    
    if (metadata && 'rcon' in metadata && metadata.rcon) {
      return {
        host: metadata.rcon.host || 'localhost',
        port: metadata.rcon.port || 25575,
        password: metadata.rcon.password || 'minecraft',
      };
    }
    
    return null;
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
    const serverPath = getActualServerPath(project, metadata?.projectPath);
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

// Track failed connection attempts to avoid retry loops
const failedConnections = new Map<string, number>();
const MAX_RETRY_ATTEMPTS = 2;

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
    
    // Check if we've failed too many times
    const failCount = failedConnections.get(project) || 0;
    if (failCount >= MAX_RETRY_ATTEMPTS) {
      return { 
        success: false, 
        error: 'RCON unavailable. Using stdin instead.' 
      };
    }
    
    // Get config
    const config = await getRconConfig(project);
    
    // If no config, RCON is not enabled
    if (!config) {
      failedConnections.set(project, failCount + 1);
      return { 
        success: false, 
        error: 'RCON not configured. Enable it first in the RCON management page.' 
      };
    }
    
    // Create connection with shorter timeout
    const rcon = await Rcon.connect({
      host: config.host,
      port: config.port,
      password: config.password,
      timeout: 2000,
    });
    
    rconConnections.set(project, rcon);
    
    // Reset fail counter on success
    failedConnections.delete(project);
    
    // Handle disconnect
    rcon.on('end', () => {
      rconConnections.delete(project);
    });
    
    return { success: true };
  } catch (error) {
    const failCount = failedConnections.get(project) || 0;
    failedConnections.set(project, failCount + 1);
    
    // Only log first failure to avoid spam
    if (failCount === 0) {
      logger.warn(`RCON connection failed for ${project}, will use stdin fallback`);
    }
    
    return { 
      success: false, 
      error: 'RCON not available' 
    };
  }
}

/**
 * Reset RCON connection state (call when server restarts)
 */
export function resetRconState(project: string): void {
  failedConnections.delete(project);
  disconnectRcon(project);
}

/**
 * Send command via RCON
 */
export async function sendRconCommand(
  project: string,
  command: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    let rcon = rconConnections.get(project);
    
    // Auto-connect if not connected
    if (!rcon || !rcon.authenticated) {
      const connectResult = await connectRcon(project);
      if (!connectResult.success) {
        return { 
          success: false, 
          error: 'RCON not available - server may not support it or needs restart' 
        };
      }
      rcon = rconConnections.get(project);
    }
    
    if (!rcon) {
      return { success: false, error: 'RCON connection not available' };
    }
    
    const response = await rcon.send(command);
    
    return { 
      success: true, 
      response: response || 'Command executed' 
    };
  } catch (error) {
    logger.warn('RCON command failed:', error);
    
    // Try to reconnect on error
    rconConnections.delete(project);
    
    return { 
      success: false, 
      error: 'RCON connection failed - using stdin fallback' 
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

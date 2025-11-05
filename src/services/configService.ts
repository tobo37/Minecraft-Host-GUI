import type { ConfigFile } from './types';

/**
 * List all configuration files for a project
 */
export async function listConfigFiles(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const project = url.searchParams.get('project');
    
    if (!project) {
      return Response.json({
        success: false,
        error: "Project parameter is required"
      }, { status: 400 });
    }
    
    const serverPath = `./server/${project}`;
    
    // Check if server directory exists
    const fs = require('fs').promises;
    try {
      await fs.access(serverPath);
    } catch {
      return Response.json({
        success: false,
        error: "Server directory not found"
      }, { status: 404 });
    }
    
    // Define all possible config files
    const configFiles: Omit<ConfigFile, 'exists' | 'enabled'>[] = [
      {
        name: 'user_jvm_args.txt',
        path: `${serverPath}/user_jvm_args.txt`,
        description: 'JVM-Argumente für den Minecraft-Server (RAM, Garbage Collection, etc.)',
        category: 'Server-Setup'
      },
      {
        name: 'eula.txt',
        path: `${serverPath}/eula.txt`,
        description: 'Minecraft End User License Agreement - muss auf "true" gesetzt werden',
        category: 'Lizenz'
      },
      {
        name: 'server.properties',
        path: `${serverPath}/server.properties`,
        description: 'Haupt-Konfigurationsdatei des Minecraft-Servers (Port, Gamemode, etc.)',
        category: 'Server-Einstellungen'
      },
      {
        name: 'whitelist.json',
        path: `${serverPath}/whitelist.json`,
        description: 'Liste der erlaubten Spieler (wenn Whitelist aktiviert ist)',
        category: 'Spieler-Verwaltung'
      },
      {
        name: 'ops.json',
        path: `${serverPath}/ops.json`,
        description: 'Liste der Operator-Spieler mit Admin-Rechten',
        category: 'Spieler-Verwaltung'
      },
      {
        name: 'banned-players.json',
        path: `${serverPath}/banned-players.json`,
        description: 'Liste der gesperrten Spieler',
        category: 'Spieler-Verwaltung'
      },
      {
        name: 'banned-ips.json',
        path: `${serverPath}/banned-ips.json`,
        description: 'Liste der gesperrten IP-Adressen',
        category: 'Spieler-Verwaltung'
      }
    ];
    
    // Check which files exist and add existence status
    const filesWithStatus: ConfigFile[] = [];
    for (const file of configFiles) {
      try {
        await fs.access(file.path);
        filesWithStatus.push({
          ...file,
          exists: true,
          enabled: true
        });
      } catch {
        // File doesn't exist, but still include it in the list
        filesWithStatus.push({
          ...file,
          exists: false,
          enabled: false
        });
      }
    }
    
    return Response.json({
      success: true,
      files: filesWithStatus
    });
    
  } catch (error) {
    console.error('Error listing config files:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Read a configuration file
 */
export async function readConfigFile(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const project = url.searchParams.get('project');
    const file = url.searchParams.get('file');
    
    if (!project || !file) {
      return Response.json({
        success: false,
        error: "Project and file parameters are required"
      }, { status: 400 });
    }
    
    const filePath = `./server/${project}/${file}`;
    
    // Security check: ensure file is within server directory
    const path = require('path');
    const resolvedPath = path.resolve(filePath);
    const serverDir = path.resolve(`./server/${project}`);
    
    if (!resolvedPath.startsWith(serverDir)) {
      return Response.json({
        success: false,
        error: "Access denied"
      }, { status: 403 });
    }
    
    try {
      const content = await Bun.file(filePath).text();
      return Response.json({
        success: true,
        content: content
      });
    } catch (error) {
      return Response.json({
        success: false,
        error: "File not found or cannot be read"
      }, { status: 404 });
    }
    
  } catch (error) {
    console.error('Error reading config file:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Save a configuration file
 */
export async function saveConfigFile(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { project, file, content } = body;
    
    if (!project || !file || content === undefined) {
      return Response.json({
        success: false,
        error: "Project, file, and content parameters are required"
      }, { status: 400 });
    }
    
    const filePath = `./server/${project}/${file}`;
    
    // Security check: ensure file is within server directory
    const path = require('path');
    const resolvedPath = path.resolve(filePath);
    const serverDir = path.resolve(`./server/${project}`);
    
    if (!resolvedPath.startsWith(serverDir)) {
      return Response.json({
        success: false,
        error: "Access denied"
      }, { status: 403 });
    }
    
    try {
      await Bun.write(filePath, content);
      return Response.json({
        success: true,
        message: "Configuration saved successfully"
      });
    } catch (error) {
      return Response.json({
        success: false,
        error: "Failed to save configuration"
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error saving config file:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
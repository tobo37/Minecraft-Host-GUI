import { serve } from "bun";
import index from "./index.html";

// Global server process management
const runningServers = new Map<string, any>();
const serverLogs = new Map<string, string[]>();

const server = serve({
  // Increase timeout for server creation operations
  idleTimeout: 60, // 60 seconds timeout
  
  routes: {
    "/api/servers": {
      async GET(req) {
        try {
          const serverDir = './server';
          
          // Use readdir to get all entries including directories
          const fs = require('fs').promises;
          const entries = await fs.readdir(serverDir);
          
          const servers = [];
          for (const entry of entries) {
            if (entry === '.gitkeep') continue;
            
            const serverPath = `${serverDir}/${entry}`;
            
            // Check if it's a directory
            const stat = await fs.stat(serverPath);
            if (!stat.isDirectory()) continue;
            
            const createdFile = `${serverPath}/.created`;
            
            let createdAt = null;
            try {
              const createdContent = await Bun.file(createdFile).text();
              createdAt = createdContent.trim();
            } catch {
              // Fallback: use directory name as date
              createdAt = entry;
            }
            
            servers.push({
              name: entry,
              path: entry,
              createdAt
            });
          }
          
          // Sort by creation date (newest first)
          servers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          return Response.json({
            servers,
            count: servers.length
          });
        } catch (error) {
          console.error('Error listing servers:', error);
          return Response.json({
            message: "Failed to list servers",
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      },
    },

    "/api/create-server": {
      async POST(req) {
        try {
          // Aktuelles Datum im Format yyyy-mm-dd
          const now = new Date();
          const dateString = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getDate()).padStart(2, '0');
          
          const serverPath = `./server/${dateString}`;
          const serverFilesZip = './serverfiles/ServerFiles-4.14.zip';
          
          // Prüfen ob Server-Ordner bereits existiert
          const serverDir = Bun.file(serverPath);
          if (await Bun.file(`${serverPath}/.created`).exists()) {
            return Response.json({
              message: "Server for this date already exists",
              status: "exists",
              serverPath: dateString
            });
          }
          
          // Server-Ordner erstellen
          await Bun.write(`${serverPath}/.gitkeep`, '');
          
          // ZIP-Datei prüfen
          const zipFile = Bun.file(serverFilesZip);
          if (!await zipFile.exists()) {
            return Response.json({
              message: "Server files not found",
              status: "error"
            }, { status: 404 });
          }
          
          // ZIP entpacken mit Bun
          console.log(`Starting extraction of ${serverFilesZip} to ${serverPath}`);
          const proc = Bun.spawn(['unzip', '-q', serverFilesZip, '-d', serverPath], {
            cwd: process.cwd(),
            stdout: 'pipe',
            stderr: 'pipe'
          });
          
          const exitCode = await proc.exited;
          console.log(`Unzip process exited with code: ${exitCode}`);
          
          if (exitCode === 0) {
            // Marker-Datei erstellen um zu zeigen, dass Server erfolgreich erstellt wurde
            const createdTimestamp = new Date().toISOString();
            console.log(`Creating .created file with timestamp: ${createdTimestamp}`);
            
            try {
              await Bun.write(`${serverPath}/.created`, createdTimestamp);
              console.log(`Successfully created .created file`);
              
              // Verify the file was created
              const createdFileExists = await Bun.file(`${serverPath}/.created`).exists();
              console.log(`Verification: .created file exists: ${createdFileExists}`);
              
              return Response.json({
                message: "Server created successfully",
                status: "success",
                serverPath: dateString,
                createdAt: createdTimestamp
              });
            } catch (writeError) {
              console.error('Error creating .created file:', writeError);
              return Response.json({
                message: "Server extracted but failed to create marker file",
                status: "error",
                error: writeError instanceof Error ? writeError.message : 'Unknown write error'
              }, { status: 500 });
            }
          } else {
            const stderr = await new Response(proc.stderr).text();
            const stdout = await new Response(proc.stdout).text();
            console.error(`Unzip failed. Exit code: ${exitCode}, stderr: ${stderr}, stdout: ${stdout}`);
            
            return Response.json({
              message: "Failed to extract server files",
              status: "error",
              error: stderr || `Process exited with code ${exitCode}`,
              stdout: stdout
            }, { status: 500 });
          }
          
        } catch (error) {
          console.error('Server creation error:', error);
          return Response.json({
            message: "Internal server error",
            status: "error",
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      },
    },

    "/api/config/list": {
      async GET(req) {
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
          
          // Define available config files
          const configFiles = [
            {
              name: 'user_jvm_args.txt',
              path: `${serverPath}/user_jvm_args.txt`,
              description: 'JVM-Argumente für den Minecraft-Server (RAM, Garbage Collection, etc.)'
            }
          ];
          
          // Check which files actually exist
          const existingFiles = [];
          for (const file of configFiles) {
            try {
              await fs.access(file.path);
              existingFiles.push(file);
            } catch {
              // File doesn't exist, skip it
            }
          }
          
          return Response.json({
            success: true,
            files: existingFiles
          });
          
        } catch (error) {
          console.error('Error listing config files:', error);
          return Response.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      },
    },

    "/api/config/read": {
      async GET(req) {
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
      },
    },

    "/api/config/save": {
      async POST(req) {
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
      },
    },

    "/api/server/status": {
      async GET(req) {
        try {
          const url = new URL(req.url);
          const project = url.searchParams.get('project');
          
          if (!project) {
            return Response.json({
              success: false,
              error: "Project parameter is required"
            }, { status: 400 });
          }
          
          const serverProcess = runningServers.get(project);
          let status = 'stopped';
          
          if (serverProcess && !serverProcess.killed) {
            status = 'running';
          }
          
          return Response.json({
            success: true,
            status: status
          });
          
        } catch (error) {
          console.error('Error checking server status:', error);
          return Response.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      },
    },

    "/api/server/start": {
      async POST(req) {
        try {
          const body = await req.json();
          const { project } = body;
          
          if (!project) {
            return Response.json({
              success: false,
              error: "Project parameter is required"
            }, { status: 400 });
          }
          
          // Check if server is already running
          const existingProcess = runningServers.get(project);
          if (existingProcess && !existingProcess.killed) {
            return Response.json({
              success: false,
              error: "Server is already running"
            }, { status: 400 });
          }
          
          const serverPath = `./server/${project}`;
          const startScript = `${serverPath}/startserver.sh`;
          
          // Check if server directory and start script exist
          const fs = require('fs').promises;
          try {
            await fs.access(serverPath);
            await fs.access(startScript);
          } catch {
            return Response.json({
              success: false,
              error: "Server directory or start script not found"
            }, { status: 404 });
          }
          
          // Make start script executable
          console.log(`Making ${startScript} executable...`);
          const chmodResult = await Bun.spawn(['chmod', '+x', startScript]).exited;
          if (chmodResult !== 0) {
            console.warn(`chmod failed with exit code: ${chmodResult}`);
          }
          
          // Also make any other .sh files executable for good measure
          try {
            const fs = require('fs').promises;
            const files = await fs.readdir(serverPath);
            const shFiles = files.filter((file: string) => file.endsWith('.sh'));
            
            for (const shFile of shFiles as string[]) {
              const shPath = `${serverPath}/${shFile}`;
              console.log(`Making ${shPath} executable...`);
              await Bun.spawn(['chmod', '+x', shPath]).exited;
            }
          } catch (error) {
            console.warn('Error making additional .sh files executable:', error);
          }
          
          // Initialize logs for this project with debug info
          const debugInfo = [
            `[${new Date().toLocaleTimeString()}] Starting Minecraft server...`,
            `[${new Date().toLocaleTimeString()}] Working directory: ${serverPath}`,
            `[${new Date().toLocaleTimeString()}] Java version check...`
          ];
          serverLogs.set(project, debugInfo);
          
          // Check Java version before starting
          try {
            const javaCheck = Bun.spawn(['java', '-version'], {
              cwd: serverPath,
              stdout: 'pipe',
              stderr: 'pipe',
              env: {
                ...process.env,
                PATH: process.env.PATH + ':/usr/bin:/bin:/usr/local/bin'
              }
            });
            
            const javaExitCode = await javaCheck.exited;
            const projectLogs = serverLogs.get(project) || [];
            if (javaExitCode === 0) {
              projectLogs.push(`[${new Date().toLocaleTimeString()}] Java is available`);
            } else {
              projectLogs.push(`[${new Date().toLocaleTimeString()}] WARNING: Java check failed (exit code: ${javaExitCode})`);
            }
            serverLogs.set(project, projectLogs);
          } catch (error) {
            const projectLogs = serverLogs.get(project) || [];
            projectLogs.push(`[${new Date().toLocaleTimeString()}] ERROR: Java check failed: ${error}`);
            serverLogs.set(project, projectLogs);
          }
          
          // Start the server process with proper environment
          console.log(`Starting server for project: ${project} in directory: ${serverPath}`);
          
          // Get current environment and add common paths
          const env = {
            ...process.env,
            PATH: process.env.PATH + ':/usr/bin:/bin:/usr/local/bin',
            TERM: 'xterm-256color',
            // Ensure Java can find the server files
            PWD: serverPath
          };
          
          // Try to start the server with different approaches
          let serverProcess;
          
          try {
            // First try: Direct bash execution
            serverProcess = Bun.spawn(['bash', './startserver.sh'], {
              cwd: serverPath,
              stdout: 'pipe',
              stderr: 'pipe',
              env: env,
              stdin: 'pipe'
            });
            
            const projectLogs = serverLogs.get(project) || [];
            projectLogs.push(`[${new Date().toLocaleTimeString()}] Started with: bash ./startserver.sh`);
            serverLogs.set(project, projectLogs);
            
          } catch (error) {
            // Fallback: Try with full path
            const projectLogs = serverLogs.get(project) || [];
            projectLogs.push(`[${new Date().toLocaleTimeString()}] First attempt failed, trying with full path...`);
            
            try {
              serverProcess = Bun.spawn(['bash', startScript], {
                cwd: serverPath,
                stdout: 'pipe',
                stderr: 'pipe',
                env: env,
                stdin: 'pipe'
              });
              
              projectLogs.push(`[${new Date().toLocaleTimeString()}] Started with: bash ${startScript}`);
              serverLogs.set(project, projectLogs);
              
            } catch (fallbackError) {
              projectLogs.push(`[${new Date().toLocaleTimeString()}] ERROR: Both start attempts failed`);
              projectLogs.push(`[${new Date().toLocaleTimeString()}] Error: ${fallbackError}`);
              serverLogs.set(project, projectLogs);
              
              return Response.json({
                success: false,
                error: `Failed to start server: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
              }, { status: 500 });
            }
          }
          
          // Store the process
          runningServers.set(project, serverProcess);
          
          // Handle stdout
          if (serverProcess.stdout) {
            const reader = serverProcess.stdout.getReader();
            const decoder = new TextDecoder();
            
            const readStdout = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  
                  const text = decoder.decode(value);
                  const lines = text.split('\n').filter(line => line.trim());
                  
                  const projectLogs = serverLogs.get(project) || [];
                  for (const line of lines) {
                    if (line.trim()) {
                      projectLogs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
                      // Keep only last 200 lines
                      if (projectLogs.length > 200) {
                        projectLogs.shift();
                      }
                    }
                  }
                  serverLogs.set(project, projectLogs);
                }
              } catch (error) {
                console.error(`Error reading stdout for ${project}:`, error);
              }
            };
            
            readStdout();
          }
          
          // Handle stderr
          if (serverProcess.stderr) {
            const reader = serverProcess.stderr.getReader();
            const decoder = new TextDecoder();
            
            const readStderr = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  
                  const text = decoder.decode(value);
                  const lines = text.split('\n').filter(line => line.trim());
                  
                  const projectLogs = serverLogs.get(project) || [];
                  for (const line of lines) {
                    if (line.trim()) {
                      projectLogs.push(`[${new Date().toLocaleTimeString()}] ERROR: ${line}`);
                      // Keep only last 200 lines
                      if (projectLogs.length > 200) {
                        projectLogs.shift();
                      }
                    }
                  }
                  serverLogs.set(project, projectLogs);
                }
              } catch (error) {
                console.error(`Error reading stderr for ${project}:`, error);
              }
            };
            
            readStderr();
          }
          
          // Handle process exit
          serverProcess.exited.then((exitCode) => {
            console.log(`Server process for ${project} exited with code: ${exitCode}`);
            const projectLogs = serverLogs.get(project) || [];
            
            if (exitCode === 0) {
              projectLogs.push(`[${new Date().toLocaleTimeString()}] Server stopped normally (exit code: ${exitCode})`);
            } else {
              projectLogs.push(`[${new Date().toLocaleTimeString()}] Server crashed or failed (exit code: ${exitCode})`);
              
              // Add some common troubleshooting hints
              if (exitCode === 1) {
                projectLogs.push(`[${new Date().toLocaleTimeString()}] Hint: Check if Java is installed and server files are present`);
              } else if (exitCode === 127) {
                projectLogs.push(`[${new Date().toLocaleTimeString()}] Hint: Command not found - check if startserver.sh exists and is executable`);
              }
            }
            
            serverLogs.set(project, projectLogs);
            runningServers.delete(project);
          });
          
          return Response.json({
            success: true,
            message: "Server started successfully"
          });
          
        } catch (error) {
          console.error('Error starting server:', error);
          return Response.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      },
    },

    "/api/server/stop": {
      async POST(req) {
        try {
          const body = await req.json();
          const { project } = body;
          
          if (!project) {
            return Response.json({
              success: false,
              error: "Project parameter is required"
            }, { status: 400 });
          }
          
          const serverProcess = runningServers.get(project);
          
          if (!serverProcess || serverProcess.killed) {
            return Response.json({
              success: false,
              error: "Server is not running"
            }, { status: 400 });
          }
          
          // Add stop message to logs
          const projectLogs = serverLogs.get(project) || [];
          projectLogs.push(`[${new Date().toLocaleTimeString()}] Stopping server...`);
          serverLogs.set(project, projectLogs);
          
          // Kill the server process
          console.log(`Stopping server for project: ${project}`);
          serverProcess.kill();
          
          // Remove from running servers
          runningServers.delete(project);
          
          return Response.json({
            success: true,
            message: "Server stopped successfully"
          });
          
        } catch (error) {
          console.error('Error stopping server:', error);
          return Response.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      },
    },

    "/api/server/logs": {
      async GET(req) {
        try {
          const url = new URL(req.url);
          const project = url.searchParams.get('project');
          
          if (!project) {
            return Response.json({
              success: false,
              error: "Project parameter is required"
            }, { status: 400 });
          }
          
          // Get logs from memory
          const logs = serverLogs.get(project) || [];
          
          return Response.json({
            success: true,
            logs: logs.slice(-100) // Return last 100 lines
          });
          
        } catch (error) {
          console.error('Error fetching server logs:', error);
          return Response.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      },
    },

    "/api/server/command": {
      async POST(req) {
        try {
          const body = await req.json();
          const { project, command } = body;
          
          if (!project || !command) {
            return Response.json({
              success: false,
              error: "Project and command parameters are required"
            }, { status: 400 });
          }
          
          const serverProcess = runningServers.get(project);
          
          if (!serverProcess || serverProcess.killed) {
            return Response.json({
              success: false,
              error: "Server is not running"
            }, { status: 400 });
          }
          
          try {
            // Send command to server stdin
            const writer = serverProcess.stdin?.getWriter();
            if (writer) {
              const encoder = new TextEncoder();
              await writer.write(encoder.encode(command + '\n'));
              writer.releaseLock();
              
              // Add command to logs
              const projectLogs = serverLogs.get(project) || [];
              projectLogs.push(`[${new Date().toLocaleTimeString()}] > ${command}`);
              serverLogs.set(project, projectLogs);
              
              return Response.json({
                success: true,
                message: "Command sent successfully"
              });
            } else {
              return Response.json({
                success: false,
                error: "Server stdin not available"
              }, { status: 500 });
            }
          } catch (error) {
            return Response.json({
              success: false,
              error: `Failed to send command: ${error instanceof Error ? error.message : 'Unknown error'}`
            }, { status: 500 });
          }
          
        } catch (error) {
          console.error('Error sending server command:', error);
          return Response.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      },
    },

    // Serve index.html for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

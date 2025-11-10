import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { ConfigurationManagement } from "./ConfigurationManagement";
import { useState, useEffect, useRef } from "react";
import type { Server } from "@/services/types";

interface ServerManagementProps {
  projectPath: string;
  onBack: () => void;
}

type ServerView = "overview" | "configuration" | "files" | "logs";
type ServerStatus = "stopped" | "starting" | "running" | "stopping";

export function ServerManagement({
  projectPath,
  onBack,
}: ServerManagementProps) {
  const { translations } = useLanguage();
  const [currentView, setCurrentView] = useState<ServerView>("overview");
  const [serverStatus, setServerStatus] = useState<ServerStatus>("stopped");
  const [logs, setLogs] = useState<string[]>([]);
  const [isPollingLogs, setIsPollingLogs] = useState(false);
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Server metadata state
  const [serverInfo, setServerInfo] = useState<Server | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [validationError, setValidationError] = useState("");

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Fetch server info on mount
  useEffect(() => {
    fetchServerInfo();
  }, [projectPath]);

  // Poll server status and logs
  useEffect(() => {
    checkServerStatus();

    return () => {
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current);
      }
    };
  }, [projectPath]);

  // Start log polling when server is running
  useEffect(() => {
    if (serverStatus === "running" && !isPollingLogs) {
      startLogPolling();
    } else if (serverStatus === "stopped" && isPollingLogs) {
      stopLogPolling();
    }
  }, [serverStatus, isPollingLogs]);

  const fetchServerInfo = async () => {
    try {
      const response = await fetch("/api/servers");
      const data = await response.json();
      if (data.success && data.servers) {
        const server = data.servers.find((s: Server) => s.path === projectPath);
        if (server) {
          setServerInfo(server);
          setNewName(server.customName || server.name);
          setNewDescription(server.description || "");
        }
      }
    } catch (error) {
      console.error("Error fetching server info:", error);
    }
  };

  const checkServerStatus = async () => {
    try {
      const response = await fetch(
        `/api/server/status?project=${encodeURIComponent(projectPath)}`
      );
      const data = await response.json();
      if (data.success) {
        setServerStatus(data.status);
      }
    } catch (error) {
      console.error("Error checking server status:", error);
    }
  };

  const startLogPolling = () => {
    if (logIntervalRef.current) return;

    setIsPollingLogs(true);
    logIntervalRef.current = setInterval(async () => {
      try {
        // Check both logs and server status
        const [logsResponse, statusResponse] = await Promise.all([
          fetch(`/api/server/logs?project=${encodeURIComponent(projectPath)}`),
          fetch(
            `/api/server/status?project=${encodeURIComponent(projectPath)}`
          ),
        ]);

        const logsData = await logsResponse.json();
        const statusData = await statusResponse.json();

        if (logsData.success && logsData.logs) {
          setLogs(logsData.logs);
        }

        if (statusData.success && statusData.status !== serverStatus) {
          // If server was running but is now stopped, it likely crashed
          if (serverStatus === "running" && statusData.status === "stopped") {
            console.warn(
              "Server appears to have crashed or stopped unexpectedly"
            );
          }
          setServerStatus(statusData.status);
        }
      } catch (error) {
        console.error("Error fetching logs/status:", error);
      }
    }, 1000); // Poll every second
  };

  const stopLogPolling = () => {
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current);
      logIntervalRef.current = null;
    }
    setIsPollingLogs(false);
  };

  const handleStartServer = async () => {
    setServerStatus("starting");
    try {
      const response = await fetch("/api/server/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project: projectPath }),
      });

      const data = await response.json();
      if (data.success) {
        setServerStatus("running");
        setLogs([]); // Clear old logs
      } else {
        setServerStatus("stopped");
        console.error("Failed to start server:", data.error);
      }
    } catch (error) {
      setServerStatus("stopped");
      console.error("Error starting server:", error);
    }
  };

  const handleStopServer = async () => {
    setServerStatus("stopping");
    try {
      const response = await fetch("/api/server/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project: projectPath }),
      });

      const data = await response.json();
      if (data.success) {
        setServerStatus("stopped");
        stopLogPolling();
      } else {
        setServerStatus("running");
        console.error("Failed to stop server:", data.error);
      }
    } catch (error) {
      setServerStatus("running");
      console.error("Error stopping server:", error);
    }
  };

  const handleRename = async () => {
    // Validate name
    const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!newName.trim() || !nameRegex.test(newName)) {
      setValidationError(
        translations.serverManagement.renameDialog.validationError
      );
      return;
    }

    try {
      const response = await fetch("/api/server/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: projectPath,
          customName: newName.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsRenameDialogOpen(false);
        setValidationError("");
        await fetchServerInfo(); // Refresh server info
      } else {
        setValidationError(data.error || "Failed to rename server");
      }
    } catch (error) {
      console.error("Error renaming server:", error);
      setValidationError("Failed to rename server");
    }
  };

  const handleUpdateDescription = async () => {
    try {
      const response = await fetch("/api/server/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: projectPath,
          description: newDescription,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsEditingDescription(false);
        await fetchServerInfo(); // Refresh server info
      } else {
        console.error("Failed to update description:", data.error);
      }
    } catch (error) {
      console.error("Error updating description:", error);
    }
  };

  const getStatusColor = (status: ServerStatus) => {
    switch (status) {
      case "running":
        return "text-green-600";
      case "starting":
        return "text-yellow-600";
      case "stopping":
        return "text-orange-600";
      case "stopped":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusText = (status: ServerStatus) => {
    switch (status) {
      case "running":
        return "Läuft";
      case "starting":
        return "Startet...";
      case "stopping":
        return "Stoppt...";
      case "stopped":
        return "Gestoppt";
      default:
        return "Unbekannt";
    }
  };

  // Handle different views
  if (currentView === "configuration") {
    return (
      <ConfigurationManagement
        projectPath={projectPath}
        onBack={() => setCurrentView("overview")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-4">
          <Button variant="outline" onClick={onBack} className="mb-4">
            ← {translations.serverManagement.backToProjects}
          </Button>
        </div>

        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-primary rounded-sm"></div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {translations.serverManagement.title}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Projekt: {projectPath}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    {translations.serverManagement.serverInfo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 text-sm">
                    {/* Custom Name */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground">
                          {translations.serverManagement.customName}:
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewName(
                              serverInfo?.customName || serverInfo?.name || ""
                            );
                            setValidationError("");
                            setIsRenameDialogOpen(true);
                          }}
                        >
                          {translations.serverManagement.renameButton}
                        </Button>
                      </div>
                      <div className="font-semibold text-base">
                        {serverInfo?.customName ||
                          serverInfo?.name ||
                          projectPath}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground">
                          {translations.serverManagement.description}:
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewDescription(serverInfo?.description || "");
                            setIsEditingDescription(!isEditingDescription);
                          }}
                        >
                          {translations.serverManagement.editDescriptionButton}
                        </Button>
                      </div>
                      {isEditingDescription ? (
                        <div className="space-y-2">
                          <Textarea
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="Describe your server..."
                            maxLength={500}
                            rows={3}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              {newDescription.length}/500
                            </span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsEditingDescription(false);
                                  setNewDescription(
                                    serverInfo?.description || ""
                                  );
                                }}
                              >
                                {
                                  translations.serverManagement.renameDialog
                                    .cancel
                                }
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleUpdateDescription}
                              >
                                {
                                  translations.serverManagement.renameDialog
                                    .save
                                }
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          {serverInfo?.description || (
                            <span className="text-muted-foreground italic">
                              No description
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Project Path */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Projekt-Pfad:
                      </span>
                      <span className="font-mono">/server/{projectPath}</span>
                    </div>

                    {/* Status */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span
                        className={`font-semibold ${getStatusColor(
                          serverStatus
                        )}`}
                      >
                        {getStatusText(serverStatus)}
                      </span>
                    </div>

                    {/* Additional metadata */}
                    {serverInfo?.sourceZipFile && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Source:</span>
                        <span className="font-mono text-xs">
                          {serverInfo.sourceZipFile}
                        </span>
                      </div>
                    )}
                    {serverInfo?.createdAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="text-xs">
                          {new Date(serverInfo.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serverStatus === "stopped" || serverStatus === "starting" ? (
                  <Button
                    size="lg"
                    className="h-16"
                    onClick={handleStartServer}
                    disabled={serverStatus === "starting"}
                  >
                    🚀{" "}
                    {serverStatus === "starting"
                      ? "Startet..."
                      : "Server starten"}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="h-16 bg-red-600 hover:bg-red-700 text-white border-red-600"
                    onClick={handleStopServer}
                    disabled={serverStatus === "stopping"}
                  >
                    🛑{" "}
                    {serverStatus === "stopping"
                      ? "Stoppt..."
                      : "Server stoppen"}
                  </Button>
                )}

                <Button
                  size="lg"
                  variant="outline"
                  className="h-16"
                  onClick={() => setCurrentView("configuration")}
                >
                  ⚙️ Konfiguration
                </Button>
                <Button size="lg" variant="outline" className="h-16">
                  📁 Dateien verwalten
                </Button>
                <Button size="lg" variant="outline" className="h-16">
                  📊 Logs anzeigen
                </Button>
              </div>

              {/* Live Logs Section */}
              {(serverStatus === "running" ||
                serverStatus === "starting" ||
                logs.length > 0) && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      📋 Server Logs
                      {isPollingLogs && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                      {logs.length === 0 ? (
                        <div className="text-gray-500">
                          Warte auf Server-Logs...
                        </div>
                      ) : (
                        logs.map((line, index) => {
                          // Detect different types of console output
                          const isError =
                            line.includes("[ERROR]") ||
                            line.includes("ERROR:") ||
                            line.includes("Exception") ||
                            line.includes("java.lang.") ||
                            line.includes("Caused by:");
                          const isWarning =
                            line.includes("[WARN]") ||
                            line.includes("WARN:") ||
                            line.includes("WARNING");
                          const isInfo =
                            line.includes("[INFO]") || line.includes("INFO:");
                          const isServerMessage =
                            line.includes("Server thread/") ||
                            line.includes("[Server thread]");
                          const isPlayerJoin =
                            line.includes("joined the game") ||
                            line.includes("left the game");
                          const isCritical =
                            line.includes("Server stopped") ||
                            line.includes("exit code:") ||
                            line.includes("Stopping server");

                          let className =
                            "whitespace-pre-wrap font-mono text-sm";

                          if (isCritical) {
                            className += " text-red-400 font-semibold";
                          } else if (isError) {
                            className += " text-red-300";
                          } else if (isWarning) {
                            className += " text-yellow-400";
                          } else if (isPlayerJoin) {
                            className += " text-blue-300";
                          } else if (isServerMessage) {
                            className += " text-green-300";
                          } else if (isInfo) {
                            className += " text-gray-300";
                          } else {
                            className += " text-green-400";
                          }

                          return (
                            <div key={index} className={className}>
                              {line}
                            </div>
                          );
                        })
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {translations.serverManagement.renameDialog.title}
            </DialogTitle>
            <DialogDescription>
              {translations.serverManagement.renameDialog.currentName}:{" "}
              {serverInfo?.customName || serverInfo?.name || projectPath}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newName">
                {translations.serverManagement.renameDialog.newNameLabel}
              </Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setValidationError("");
                }}
                placeholder="Enter new server name"
                maxLength={100}
              />
              {validationError && (
                <p className="text-sm text-red-500">{validationError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRenameDialogOpen(false);
                setValidationError("");
                setNewName(serverInfo?.customName || serverInfo?.name || "");
              }}
            >
              {translations.serverManagement.renameDialog.cancel}
            </Button>
            <Button onClick={handleRename}>
              {translations.serverManagement.renameDialog.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { ConfigurationManagement } from "./ConfigurationManagement";
import { ServerHeader } from "./server/ServerHeader";
import { ServerInfoCard } from "./server/ServerInfoCard";
import { ServerControls } from "./server/ServerControls";
import { ServerLogs } from "./server/ServerLogs";
import { RenameDialog } from "./server/RenameDialog";
import { DeleteDialog } from "./server/DeleteDialog";
import { StartFileDialog } from "./server/StartFileDialog";
import { useServerStatus } from "@/hooks/useServerStatus";
import { useState, useEffect } from "react";
import type { Server } from "@/services/types";

interface ServerManagementProps {
  projectPath: string;
  onBack: () => void;
}

type ServerView = "overview" | "configuration" | "files" | "logs";

export function ServerManagement({
  projectPath,
  onBack,
}: ServerManagementProps) {
  const { translations } = useLanguage();
  const [currentView, setCurrentView] = useState<ServerView>("overview");

  // Use custom hook for server status and logs
  const { serverStatus, logs, isPollingLogs, startServer, stopServer } =
    useServerStatus(projectPath);

  // Server metadata state
  const [serverInfo, setServerInfo] = useState<Server | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [validationError, setValidationError] = useState("");

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteValidationError, setDeleteValidationError] = useState("");

  // Start file dialog state
  const [isStartFileDialogOpen, setIsStartFileDialogOpen] = useState(false);
  const [startFileCandidates, setStartFileCandidates] = useState<any[]>([]);
  const [selectedStartFile, setSelectedStartFile] = useState<string>("");
  const [isSearchingStartFiles, setIsSearchingStartFiles] = useState(false);

  // Fetch server info on mount
  useEffect(() => {
    fetchServerInfo();
  }, [projectPath]);

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

  const handleRename = async () => {
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
        await fetchServerInfo();
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
        await fetchServerInfo();
      } else {
        console.error("Failed to update description:", data.error);
      }
    } catch (error) {
      console.error("Error updating description:", error);
    }
  };

  const handleDeleteServer = async () => {
    const serverName =
      serverInfo?.customName || serverInfo?.name || projectPath;
    if (deleteConfirmName.trim() !== serverName) {
      setDeleteValidationError(
        translations.serverManagement.deleteDialog.validationError
      );
      return;
    }

    try {
      const response = await fetch(
        `/api/server/delete?project=${encodeURIComponent(projectPath)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();
      if (data.success) {
        setIsDeleteDialogOpen(false);
        onBack();
      } else {
        setDeleteValidationError(data.error || "Failed to delete server");
      }
    } catch (error) {
      console.error("Error deleting server:", error);
      setDeleteValidationError("Failed to delete server");
    }
  };

  const handleFindStartFiles = async () => {
    setIsSearchingStartFiles(true);
    setIsStartFileDialogOpen(true);

    try {
      const response = await fetch(
        `/api/server/find-start-files?project=${encodeURIComponent(projectPath)}`
      );
      const data = await response.json();

      if (data.success) {
        setStartFileCandidates(data.candidates || []);
        if (serverInfo?.startFile) {
          setSelectedStartFile(serverInfo.startFile);
        } else if (data.candidates && data.candidates.length > 0) {
          const highConfidence = data.candidates.find(
            (c: any) => c.confidence === "high"
          );
          setSelectedStartFile(
            highConfidence?.path || data.candidates[0].path
          );
        }
      } else {
        console.error("Failed to find start files:", data.error);
      }
    } catch (error) {
      console.error("Error finding start files:", error);
    } finally {
      setIsSearchingStartFiles(false);
    }
  };

  const handleSetStartFile = async () => {
    if (!selectedStartFile) return;

    try {
      const response = await fetch("/api/server/set-start-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: projectPath,
          startFile: selectedStartFile,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsStartFileDialogOpen(false);
        await fetchServerInfo();
      } else {
        console.error("Failed to set start file:", data.error);
      }
    } catch (error) {
      console.error("Error setting start file:", error);
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
          <ServerHeader serverInfo={serverInfo} projectPath={projectPath} />

          <CardContent className="space-y-6">
            <div className="grid gap-6">
              <ServerInfoCard
                serverInfo={serverInfo}
                projectPath={projectPath}
                serverStatus={serverStatus}
                isEditingDescription={isEditingDescription}
                newDescription={newDescription}
                onRenameClick={() => {
                  setNewName(serverInfo?.customName || serverInfo?.name || "");
                  setValidationError("");
                  setIsRenameDialogOpen(true);
                }}
                onEditDescriptionClick={() => {
                  setNewDescription(serverInfo?.description || "");
                  setIsEditingDescription(!isEditingDescription);
                }}
                onDescriptionChange={setNewDescription}
                onCancelDescription={() => {
                  setIsEditingDescription(false);
                  setNewDescription(serverInfo?.description || "");
                }}
                onSaveDescription={handleUpdateDescription}
              />

              <ServerControls
                serverStatus={serverStatus}
                onStart={startServer}
                onStop={stopServer}
                onFindStartFiles={handleFindStartFiles}
                onConfiguration={() => setCurrentView("configuration")}
              />

              {(serverStatus === "running" ||
                serverStatus === "starting" ||
                logs.length > 0) && (
                <ServerLogs logs={logs} isPolling={isPollingLogs} />
              )}

              {/* Delete Server Button */}
              <div className="mt-8 pt-6 border-t border-border">
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-full h-14 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    setDeleteConfirmName("");
                    setDeleteValidationError("");
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  🗑️ {translations.serverManagement.deleteButton}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <RenameDialog
        open={isRenameDialogOpen}
        serverInfo={serverInfo}
        projectPath={projectPath}
        newName={newName}
        validationError={validationError}
        onOpenChange={setIsRenameDialogOpen}
        onNameChange={(value) => {
          setNewName(value);
          setValidationError("");
        }}
        onSave={handleRename}
        onCancel={() => {
          setIsRenameDialogOpen(false);
          setValidationError("");
          setNewName(serverInfo?.customName || serverInfo?.name || "");
        }}
      />

      <DeleteDialog
        open={isDeleteDialogOpen}
        serverInfo={serverInfo}
        projectPath={projectPath}
        confirmName={deleteConfirmName}
        validationError={deleteValidationError}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirmNameChange={(value) => {
          setDeleteConfirmName(value);
          setDeleteValidationError("");
        }}
        onDelete={handleDeleteServer}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setDeleteConfirmName("");
          setDeleteValidationError("");
        }}
      />

      <StartFileDialog
        open={isStartFileDialogOpen}
        serverInfo={serverInfo}
        candidates={startFileCandidates}
        selectedFile={selectedStartFile}
        isSearching={isSearchingStartFiles}
        onOpenChange={setIsStartFileDialogOpen}
        onSelectFile={setSelectedStartFile}
        onConfirm={handleSetStartFile}
        onCancel={() => {
          setIsStartFileDialogOpen(false);
          setStartFileCandidates([]);
          setSelectedStartFile("");
        }}
      />
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { ServerHeader } from "./ServerHeader";
import { ServerInfoCard } from "./ServerInfoCard";
import { ServerControls } from "./ServerControls";
import { ServerLogs } from "./ServerLogs";
import { RenameDialog } from "./RenameDialog";
import { DeleteDialog } from "./DeleteDialog";
import { StartFileDialog } from "./StartFileDialog";
import type { Server, ServerStatus } from "@/services/types";

interface ServerOverviewProps {
  projectPath: string;
  serverInfo: Server | null;
  serverStatus: ServerStatus;
  logs: string[];
  isPollingLogs: boolean;
  onBack: () => void;
  onStartServer: () => void;
  onStopServer: () => void;
  onJavaClick: () => void;
  onConfigurationClick: () => void;
  metadata: {
    isRenameDialogOpen: boolean;
    newName: string;
    validationError: string;
    setNewName: (name: string) => void;
    setValidationError: (error: string) => void;
    handleRename: () => Promise<void>;
    openRenameDialog: (currentName: string) => void;
    closeRenameDialog: (currentName: string) => void;
  };
  description: {
    isEditingDescription: boolean;
    newDescription: string;
    setNewDescription: (desc: string) => void;
    handleUpdateDescription: () => Promise<void>;
    startEditing: (currentDescription: string) => void;
    cancelEditing: (currentDescription: string) => void;
  };
  deleteServer: {
    isDeleteDialogOpen: boolean;
    deleteConfirmName: string;
    deleteValidationError: string;
    setDeleteConfirmName: (name: string) => void;
    setDeleteValidationError: (error: string) => void;
    handleDeleteServer: (serverName: string) => Promise<void>;
    openDeleteDialog: () => void;
    closeDeleteDialog: () => void;
  };
  startFile: {
    isStartFileDialogOpen: boolean;
    startFileCandidates: any[];
    selectedStartFile: string;
    isSearchingStartFiles: boolean;
    setSelectedStartFile: (file: string) => void;
    handleFindStartFiles: () => Promise<void>;
    handleSetStartFile: () => Promise<void>;
    closeStartFileDialog: () => void;
    setIsStartFileDialogOpen: (open: boolean) => void;
  };
}

export function ServerOverview({
  projectPath,
  serverInfo,
  serverStatus,
  logs,
  isPollingLogs,
  onBack,
  onStartServer,
  onStopServer,
  onJavaClick,
  onConfigurationClick,
  metadata,
  description,
  deleteServer,
  startFile,
}: ServerOverviewProps) {
  const { translations } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-4">
          <Button variant="outline" onClick={onBack} className="mb-4">
            ← {translations.serverManagement.backToProjects}
          </Button>
        </div>

        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <ServerHeader
            serverInfo={serverInfo}
            projectPath={projectPath}
            onJavaClick={onJavaClick}
          />

          <CardContent className="space-y-6">
            <div className="grid gap-6">
              <ServerInfoCard
                serverInfo={serverInfo}
                projectPath={projectPath}
                serverStatus={serverStatus}
                isEditingDescription={description.isEditingDescription}
                newDescription={description.newDescription}
                onRenameClick={() => {
                  metadata.openRenameDialog(
                    serverInfo?.customName || serverInfo?.name || ""
                  );
                }}
                onEditDescriptionClick={() => {
                  if (description.isEditingDescription) {
                    description.cancelEditing(serverInfo?.description || "");
                  } else {
                    description.startEditing(serverInfo?.description || "");
                  }
                }}
                onDescriptionChange={description.setNewDescription}
                onCancelDescription={() => {
                  description.cancelEditing(serverInfo?.description || "");
                }}
                onSaveDescription={description.handleUpdateDescription}
              />

              <ServerControls
                serverStatus={serverStatus}
                onStart={onStartServer}
                onStop={onStopServer}
                onFindStartFiles={startFile.handleFindStartFiles}
                onConfiguration={onConfigurationClick}
              />

              {(serverStatus === "running" ||
                serverStatus === "starting" ||
                logs.length > 0) && (
                <ServerLogs logs={logs} isPolling={isPollingLogs} />
              )}

              <div className="mt-8 pt-6 border-t border-border">
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-full h-14 bg-red-600 hover:bg-red-700 text-white"
                  onClick={deleteServer.openDeleteDialog}
                >
                  🗑️ {translations.serverManagement.deleteButton}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <RenameDialog
        open={metadata.isRenameDialogOpen}
        serverInfo={serverInfo}
        projectPath={projectPath}
        newName={metadata.newName}
        validationError={metadata.validationError}
        onOpenChange={(open) => {
          if (!open) {
            metadata.closeRenameDialog(
              serverInfo?.customName || serverInfo?.name || ""
            );
          }
        }}
        onNameChange={(value) => {
          metadata.setNewName(value);
          metadata.setValidationError("");
        }}
        onSave={metadata.handleRename}
        onCancel={() => {
          metadata.closeRenameDialog(
            serverInfo?.customName || serverInfo?.name || ""
          );
        }}
      />

      <DeleteDialog
        open={deleteServer.isDeleteDialogOpen}
        serverInfo={serverInfo}
        projectPath={projectPath}
        confirmName={deleteServer.deleteConfirmName}
        validationError={deleteServer.deleteValidationError}
        onOpenChange={(open) => {
          if (!open) {
            deleteServer.closeDeleteDialog();
          }
        }}
        onConfirmNameChange={(value) => {
          deleteServer.setDeleteConfirmName(value);
          deleteServer.setDeleteValidationError("");
        }}
        onDelete={() => {
          const serverName =
            serverInfo?.customName || serverInfo?.name || projectPath;
          deleteServer.handleDeleteServer(serverName);
        }}
        onCancel={deleteServer.closeDeleteDialog}
      />

      <StartFileDialog
        open={startFile.isStartFileDialogOpen}
        serverInfo={serverInfo}
        candidates={startFile.startFileCandidates}
        selectedFile={startFile.selectedStartFile}
        isSearching={startFile.isSearchingStartFiles}
        onOpenChange={(open) => {
          if (!open) {
            startFile.closeStartFileDialog();
          } else {
            startFile.setIsStartFileDialogOpen(open);
          }
        }}
        onSelectFile={startFile.setSelectedStartFile}
        onConfirm={startFile.handleSetStartFile}
        onCancel={startFile.closeStartFileDialog}
      />
    </div>
  );
}

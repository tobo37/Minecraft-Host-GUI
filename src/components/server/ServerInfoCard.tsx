import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import type { Server } from "@/services/types";

type ServerStatus = "stopped" | "starting" | "running" | "stopping";

interface ServerInfoCardProps {
  serverInfo: Server | null;
  projectPath: string;
  serverStatus: ServerStatus;
  isEditingDescription: boolean;
  newDescription: string;
  onRenameClick: () => void;
  onEditDescriptionClick: () => void;
  onDescriptionChange: (value: string) => void;
  onCancelDescription: () => void;
  onSaveDescription: () => void;
}

export function ServerInfoCard({
  serverInfo,
  projectPath,
  serverStatus,
  isEditingDescription,
  newDescription,
  onRenameClick,
  onEditDescriptionClick,
  onDescriptionChange,
  onCancelDescription,
  onSaveDescription,
}: ServerInfoCardProps) {
  const { translations } = useLanguage();

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

  return (
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
              <Button variant="outline" size="sm" onClick={onRenameClick}>
                {translations.serverManagement.renameButton}
              </Button>
            </div>
            <div className="font-semibold text-base">
              {serverInfo?.customName || serverInfo?.name || projectPath}
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
                onClick={onEditDescriptionClick}
              >
                {translations.serverManagement.editDescriptionButton}
              </Button>
            </div>
            {isEditingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={newDescription}
                  onChange={(e) => onDescriptionChange(e.target.value)}
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
                      onClick={onCancelDescription}
                    >
                      {translations.serverManagement.renameDialog.cancel}
                    </Button>
                    <Button size="sm" onClick={onSaveDescription}>
                      {translations.serverManagement.renameDialog.save}
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
            <span className="text-muted-foreground">Projekt-Pfad:</span>
            <span className="font-mono">/server/{projectPath}</span>
          </div>

          {/* Status */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className={`font-semibold ${getStatusColor(serverStatus)}`}>
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
          {serverInfo?.startFile && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start File:</span>
              <span className="font-mono text-xs">{serverInfo.startFile}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { ServerInfoHeader } from "./ServerInfoHeader";
import { ServerInfoDetails } from "./ServerInfoDetails";
import { ServerInfoActions } from "./ServerInfoActions";
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
  onDescriptionChange: (_value: string) => void;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {translations.serverManagement.serverInfo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 text-sm">
          <ServerInfoHeader
            serverInfo={serverInfo}
            projectPath={projectPath}
            onRenameClick={onRenameClick}
          />

          <ServerInfoActions
            serverInfo={serverInfo}
            isEditingDescription={isEditingDescription}
            newDescription={newDescription}
            onEditDescriptionClick={onEditDescriptionClick}
            onDescriptionChange={onDescriptionChange}
            onCancelDescription={onCancelDescription}
            onSaveDescription={onSaveDescription}
          />

          <ServerInfoDetails
            serverInfo={serverInfo}
            projectPath={projectPath}
            serverStatus={serverStatus}
          />
        </div>
      </CardContent>
    </Card>
  );
}

import type { Server } from "@/services/types";

type ServerStatus = "stopped" | "starting" | "running" | "stopping";

interface ServerInfoDetailsProps {
  serverInfo: Server | null;
  projectPath: string;
  serverStatus: ServerStatus;
}

export function ServerInfoDetails({
  serverInfo,
  projectPath,
  serverStatus,
}: ServerInfoDetailsProps) {
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
    <>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Projekt-Pfad:</span>
        <span className="font-mono">/server/{projectPath}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-muted-foreground">Status:</span>
        <span className={`font-semibold ${getStatusColor(serverStatus)}`}>
          {getStatusText(serverStatus)}
        </span>
      </div>

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
    </>
  );
}

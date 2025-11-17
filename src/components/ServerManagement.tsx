import { useState } from "react";
import { useServerStatus } from "@/hooks/useServerStatus";
import { useServerInfo } from "@/hooks/useServerInfo";
import { useServerMetadata } from "@/hooks/useServerMetadata";
import { useServerDescription } from "@/hooks/useServerDescription";
import { useServerDelete } from "@/hooks/useServerDelete";
import { useStartFile } from "@/hooks/useStartFile";
import { useProjectPath } from "@/hooks/useProjectPath";
import { ServerOverview } from "@/components/server/ServerOverview";
import { ConfigurationManagement } from "@/features/config";
import { JavaManagement } from "@/features/java/JavaManagement";
import { RconManagement } from "@/features/rcon";

interface ServerManagementProps {
  projectPath: string;
  onBack: () => void;
}

type ServerView = "overview" | "configuration" | "java" | "rcon";

export function ServerManagement({ projectPath, onBack }: ServerManagementProps) {
  const [currentView, setCurrentView] = useState<ServerView>("overview");

  // Server data and status
  const { serverInfo, refetch: refetchServerInfo } = useServerInfo(projectPath);
  const { serverStatus, logs, isPollingLogs, startServer, stopServer } =
    useServerStatus(projectPath);

  // Server metadata management
  const metadata = useServerMetadata({
    projectPath,
    onSuccess: refetchServerInfo,
  });

  // Description management
  const description = useServerDescription({
    projectPath,
    onSuccess: refetchServerInfo,
  });

  // Delete management
  const deleteServer = useServerDelete({
    projectPath,
    onSuccess: onBack,
  });

  // Start file management
  const startFile = useStartFile({
    projectPath,
    currentStartFile: serverInfo?.startFile,
    onSuccess: refetchServerInfo,
  });

  // Project path management
  const projectPathHook = useProjectPath({
    projectPath,
    currentProjectPath: serverInfo?.projectPath,
    onSuccess: refetchServerInfo,
  });

  // Handle different views
  if (currentView === "configuration") {
    return (
      <ConfigurationManagement
        projectPath={projectPath}
        onBack={() => setCurrentView("overview")}
      />
    );
  }

  if (currentView === "java") {
    return <JavaManagement onBack={() => setCurrentView("overview")} />;
  }

  if (currentView === "rcon") {
    return <RconManagement projectPath={projectPath} onBack={() => setCurrentView("overview")} />;
  }

  return (
    <ServerOverview
      projectPath={projectPath}
      serverInfo={serverInfo}
      serverStatus={serverStatus}
      logs={logs}
      isPollingLogs={isPollingLogs}
      onBack={onBack}
      onStartServer={startServer}
      onStopServer={stopServer}
      onJavaClick={() => setCurrentView("java")}
      onConfigurationClick={() => setCurrentView("configuration")}
      onRconClick={() => setCurrentView("rcon")}
      metadata={metadata}
      description={description}
      deleteServer={deleteServer}
      startFile={startFile}
      projectPathHook={projectPathHook}
    />
  );
}

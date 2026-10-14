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
import { FileManagement } from "@/features/files";
import { NotFoundPage } from "@/components/NotFoundPage";
import { useLanguage } from "@/hooks/useLanguage";
import { navigate, routes, type ServerView } from "@/lib/router";
import type { Server } from "@/services/types";

interface ServerManagementProps {
  projectPath: string;
  view: ServerView;
}

export function ServerManagement({ projectPath, view }: ServerManagementProps) {
  const { translations } = useLanguage();
  const { serverInfo, isLoading, notFound, refetch } = useServerInfo(projectPath);

  if (notFound) {
    return <NotFoundPage description={translations.common.serverNotFoundDescription} />;
  }

  // Only block on the first load; refetches must not unmount the workspace and its polling.
  if (!serverInfo && isLoading) {
    return (
      <div className="app-page flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ServerWorkspace
      projectPath={projectPath}
      view={view}
      serverInfo={serverInfo}
      refetchServerInfo={refetch}
    />
  );
}

interface ServerWorkspaceProps {
  projectPath: string;
  view: ServerView;
  serverInfo: Server | null;
  refetchServerInfo: () => Promise<void>;
}

function ServerWorkspace({ projectPath, view, serverInfo, refetchServerInfo }: ServerWorkspaceProps) {
  const overviewHref = routes.server(projectPath);

  // Start file management
  const startFile = useStartFile({
    projectPath,
    currentStartFile: serverInfo?.startFile,
    onSuccess: refetchServerInfo,
  });

  const { serverStatus, logs, isPollingLogs, startServer, killServer, shutdownServer } = useServerStatus(
    projectPath,
    {
      // A start that failed because the start file is gone should offer to pick a new one.
      onMissingStartFile: () => startFile.handleFindStartFiles(),
    }
  );

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
    onSuccess: () => navigate(routes.projects()),
  });

  // Project path management
  const projectPathHook = useProjectPath({
    projectPath,
    currentProjectPath: serverInfo?.projectPath,
    onSuccess: refetchServerInfo,
  });

  // Handle different views
  if (view === "configuration") {
    return (
      <ConfigurationManagement
        projectPath={projectPath}
        serverStatus={serverStatus}
        backHref={overviewHref}
      />
    );
  }

  if (view === "files") {
    return (
      <FileManagement
        projectPath={projectPath}
        serverStatus={serverStatus}
        backHref={overviewHref}
      />
    );
  }

  if (view === "java") {
    return <JavaManagement backHref={overviewHref} />;
  }

  if (view === "rcon") {
    return <RconManagement projectPath={projectPath} backHref={overviewHref} />;
  }

  return (
    <ServerOverview
      projectPath={projectPath}
      serverInfo={serverInfo}
      serverStatus={serverStatus}
      logs={logs}
      isPollingLogs={isPollingLogs}
      backHref={routes.projects()}
      onStartServer={startServer}
      onShutdownServer={shutdownServer}
      onKillServer={killServer}
      javaHref={routes.server(projectPath, "java")}
      configurationHref={routes.server(projectPath, "configuration")}
      filesHref={routes.server(projectPath, "files")}
      rconHref={routes.server(projectPath, "rcon")}
      metadata={metadata}
      description={description}
      deleteServer={deleteServer}
      startFile={startFile}
      projectPathHook={projectPathHook}
    />
  );
}

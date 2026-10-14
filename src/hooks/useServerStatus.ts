import { useServerPolling } from "./useServerPolling";
import { useServerLogs } from "./useServerLogs";

interface UseServerStatusOptions {
  onMissingStartFile?: (_expectedStartFile: string, _error: string) => void;
}

export function useServerStatus(projectPath: string, options: UseServerStatusOptions = {}) {
  const { serverStatus, startServer, killServer, shutdownServer } = useServerPolling({
    projectPath,
    onMissingStartFile: options.onMissingStartFile,
  });

  const { logs, isPollingLogs } = useServerLogs({
    projectPath,
    serverStatus,
  });

  return {
    serverStatus,
    logs,
    isPollingLogs,
    startServer,
    killServer,
    shutdownServer,
  };
}

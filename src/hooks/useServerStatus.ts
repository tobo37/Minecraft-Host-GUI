import { useServerPolling } from "./useServerPolling";
import { useServerLogs } from "./useServerLogs";

export function useServerStatus(projectPath: string) {
  const { serverStatus, startServer, stopServer } = useServerPolling({
    projectPath,
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
    stopServer,
  };
}

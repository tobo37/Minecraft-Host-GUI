import { useState, useEffect, useRef, useCallback } from "react";
import type { ServerStatus } from "@/services/types";

interface UseServerLogsProps {
  projectPath: string;
  serverStatus: ServerStatus;
}

export function useServerLogs({ projectPath, serverStatus }: UseServerLogsProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isPollingLogs, setIsPollingLogs] = useState(false);
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startLogPolling = useCallback(() => {
    if (logIntervalRef.current) return;

    setIsPollingLogs(true);
    logIntervalRef.current = setInterval(async () => {
      try {
        const logsResponse = await fetch(
          `/api/server/logs?project=${encodeURIComponent(projectPath)}`
        );
        const logsData = await logsResponse.json();

        if (logsData.success && logsData.logs) {
          setLogs(logsData.logs);
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    }, 1000);
  }, [projectPath]);

  const stopLogPolling = useCallback(() => {
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current);
      logIntervalRef.current = null;
    }
    setIsPollingLogs(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    if (serverStatus === "running" && !isPollingLogs) {
      startLogPolling();
    } else if (serverStatus === "stopped" && isPollingLogs) {
      stopLogPolling();
    }
  }, [serverStatus, isPollingLogs, startLogPolling, stopLogPolling]);

  useEffect(() => {
    return () => {
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current);
      }
    };
  }, []);

  return {
    logs,
    isPollingLogs,
    clearLogs,
  };
}

import { useState, useEffect, useRef } from "react";
import type { ServerStatus } from "@/services/types";

export function useServerStatus(projectPath: string) {
  const [serverStatus, setServerStatus] = useState<ServerStatus>("stopped");
  const [logs, setLogs] = useState<string[]>([]);
  const [isPollingLogs, setIsPollingLogs] = useState(false);
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check server status on mount
  useEffect(() => {
    checkServerStatus();

    return () => {
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current);
      }
    };
  }, [projectPath]);

  // Start/stop log polling based on server status
  useEffect(() => {
    if (serverStatus === "running" && !isPollingLogs) {
      startLogPolling();
    } else if (serverStatus === "stopped" && isPollingLogs) {
      stopLogPolling();
    }
  }, [serverStatus, isPollingLogs]);

  const checkServerStatus = async () => {
    try {
      const response = await fetch(
        `/api/server/status?project=${encodeURIComponent(projectPath)}`
      );
      const data = await response.json();
      if (data.success) {
        setServerStatus(data.status);
      }
    } catch (error) {
      console.error("Error checking server status:", error);
    }
  };

  const startLogPolling = () => {
    if (logIntervalRef.current) return;

    setIsPollingLogs(true);
    logIntervalRef.current = setInterval(async () => {
      try {
        const [logsResponse, statusResponse] = await Promise.all([
          fetch(`/api/server/logs?project=${encodeURIComponent(projectPath)}`),
          fetch(
            `/api/server/status?project=${encodeURIComponent(projectPath)}`
          ),
        ]);

        const logsData = await logsResponse.json();
        const statusData = await statusResponse.json();

        if (logsData.success && logsData.logs) {
          setLogs(logsData.logs);
        }

        if (statusData.success && statusData.status !== serverStatus) {
          if (serverStatus === "running" && statusData.status === "stopped") {
            console.warn(
              "Server appears to have crashed or stopped unexpectedly"
            );
          }
          setServerStatus(statusData.status);
        }
      } catch (error) {
        console.error("Error fetching logs/status:", error);
      }
    }, 1000);
  };

  const stopLogPolling = () => {
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current);
      logIntervalRef.current = null;
    }
    setIsPollingLogs(false);
  };

  const startServer = async () => {
    setServerStatus("starting");
    try {
      const response = await fetch("/api/server/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project: projectPath }),
      });

      const data = await response.json();
      if (data.success) {
        setServerStatus("running");
        setLogs([]);
      } else {
        setServerStatus("stopped");
        console.error("Failed to start server:", data.error);
      }
    } catch (error) {
      setServerStatus("stopped");
      console.error("Error starting server:", error);
    }
  };

  const stopServer = async () => {
    setServerStatus("stopping");
    try {
      const response = await fetch("/api/server/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project: projectPath }),
      });

      const data = await response.json();
      if (data.success) {
        setServerStatus("stopped");
        stopLogPolling();
      } else {
        setServerStatus("running");
        console.error("Failed to stop server:", data.error);
      }
    } catch (error) {
      setServerStatus("running");
      console.error("Error stopping server:", error);
    }
  };

  return {
    serverStatus,
    logs,
    isPollingLogs,
    startServer,
    stopServer,
  };
}

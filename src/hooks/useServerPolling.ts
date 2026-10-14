import { useState, useEffect, useCallback } from "react";
import type { ServerStatus } from "@/services/types";

interface UseServerPollingProps {
  projectPath: string;
  onStatusChange?: (_status: ServerStatus) => void;
  onMissingStartFile?: (_expectedStartFile: string, _error: string) => void;
}

export function useServerPolling({
  projectPath,
  onStatusChange,
  onMissingStartFile,
}: UseServerPollingProps) {
  const [serverStatus, setServerStatus] = useState<ServerStatus>("stopped");

  const checkServerStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/server/status?project=${encodeURIComponent(projectPath)}`);
      const data = await response.json();
      if (data.success) {
        const newStatus = data.status;
        setServerStatus((prevStatus) => {
          if (newStatus !== prevStatus) {
            onStatusChange?.(newStatus);
            return newStatus;
          }
          return prevStatus;
        });
      }
    } catch (error) {
      console.error("Error checking server status:", error);
    }
  }, [projectPath, onStatusChange]);

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
      } else {
        setServerStatus("stopped");
        console.error("Failed to start server:", data.error);
        if (data.requiresStartFileSelection) {
          onMissingStartFile?.(data.expectedStartFile || "", data.error || "");
        }
      }
    } catch (error) {
      setServerStatus("stopped");
      console.error("Error starting server:", error);
    }
  };

  const postStopRequest = async (endpoint: string) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ project: projectPath }),
    });
    return response.json();
  };

  /** Kill the server process immediately (no world save) */
  const killServer = async () => {
    setServerStatus("stopping");
    try {
      const data = await postStopRequest("/api/server/stop");
      if (data.success) {
        setServerStatus("stopped");
      } else {
        setServerStatus("running");
        console.error("Failed to kill server:", data.error);
      }
    } catch (error) {
      setServerStatus("running");
      console.error("Error killing server:", error);
    }
  };

  /** Save the world, stop the server and wait until it has exited */
  const shutdownServer = async () => {
    setServerStatus("stopping");
    try {
      const data = await postStopRequest("/api/server/shutdown");
      if (!data.success) {
        setServerStatus("running");
        console.error("Failed to shut down server:", data.error);
        return;
      }

      let status: ServerStatus = "stopping";
      while (status === "stopping") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const response = await fetch(
          `/api/server/status?project=${encodeURIComponent(projectPath)}`
        );
        const statusData = await response.json();
        if (statusData.success) {
          status = statusData.status;
        }
      }
      setServerStatus(status);
    } catch (error) {
      await checkServerStatus();
      console.error("Error shutting down server:", error);
    }
  };

  useEffect(() => {
    checkServerStatus();
  }, [checkServerStatus]);

  return {
    serverStatus,
    checkServerStatus,
    startServer,
    killServer,
    shutdownServer,
  };
}

import { useState, useEffect, useCallback } from "react";
import type { ServerStatus } from "@/services/types";

interface UseServerPollingProps {
  projectPath: string;
  onStatusChange?: (_status: ServerStatus) => void;
}

export function useServerPolling({ projectPath, onStatusChange }: UseServerPollingProps) {
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
      } else {
        setServerStatus("running");
        console.error("Failed to stop server:", data.error);
      }
    } catch (error) {
      setServerStatus("running");
      console.error("Error stopping server:", error);
    }
  };

  useEffect(() => {
    checkServerStatus();
  }, [checkServerStatus]);

  return {
    serverStatus,
    checkServerStatus,
    startServer,
    stopServer,
  };
}

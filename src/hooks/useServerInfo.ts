import { useState, useEffect, useCallback } from "react";
import type { Server } from "@/services/types";

export function useServerInfo(projectPath: string) {
  const [serverInfo, setServerInfo] = useState<Server | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServerInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/servers");
      const data = await response.json();
      if (data.success && data.servers) {
        const server = data.servers.find((s: Server) => s.path === projectPath);
        if (server) {
          setServerInfo(server);
        }
      }
    } catch (error) {
      console.error("Error fetching server info:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    fetchServerInfo();
  }, [fetchServerInfo]);

  return { serverInfo, isLoading, refetch: fetchServerInfo };
}

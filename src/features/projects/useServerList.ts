import { useState, useEffect } from "react";
import type { Server } from "@/services/types";

export function useServerList() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServers();

    // Poll server status every 5 seconds
    const interval = setInterval(() => {
      fetchServers();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch("/api/servers");
      const data = await response.json();
      setServers(data.servers || []);
    } catch (error) {
      console.error("Error fetching servers:", error);
    } finally {
      setLoading(false);
    }
  };

  return { servers, loading, refresh: fetchServers };
}

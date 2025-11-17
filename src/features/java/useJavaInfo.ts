import { useState, useEffect, useCallback } from "react";

export interface JavaInfo {
  installed: boolean;
  version?: string;
  path?: string;
}

export interface JabbaInfo {
  installed: boolean;
  versions?: string[];
  current?: string;
}

export function useJavaInfo() {
  const [javaInfo, setJavaInfo] = useState<JavaInfo | null>(null);
  const [jabbaInfo, setJabbaInfo] = useState<JabbaInfo | null>(null);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableVersions = useCallback(async () => {
    try {
      const response = await fetch("/api/java/jabba/ls-remote");
      const data = await response.json();

      if (data.success && data.versions) {
        setAvailableVersions(data.versions);
      }
    } catch (err) {
      console.error("Failed to fetch available versions:", err);
    }
  }, []);

  const fetchJavaInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [javaRes, jabbaRes] = await Promise.all([
        fetch("/api/java/info"),
        fetch("/api/java/jabba/info"),
      ]);

      const javaData = await javaRes.json();
      const jabbaData = await jabbaRes.json();

      setJavaInfo(javaData);
      setJabbaInfo(jabbaData);

      if (jabbaData.installed && (!jabbaData.versions || jabbaData.versions.length === 0)) {
        fetchAvailableVersions();
      }
    } catch (err) {
      setError("Failed to fetch Java information");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchAvailableVersions]);

  useEffect(() => {
    fetchJavaInfo();
  }, [fetchJavaInfo]);

  return {
    javaInfo,
    jabbaInfo,
    availableVersions,
    loading,
    error,
    refresh: fetchJavaInfo,
  };
}

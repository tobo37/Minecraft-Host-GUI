import { useState, useEffect, useCallback, useRef } from "react";
import { setSearchParam, useSearchParam } from "@/lib/router";

export interface ConfigFile {
  name: string;
  path: string;
  description: string;
  category: string;
  exists: boolean;
  enabled: boolean;
}

interface UseConfigFilesReturn {
  configFiles: ConfigFile[];
  selectedConfig: ConfigFile | null;
  configContent: string;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string;
  loadConfigFiles: () => Promise<void>;
  selectConfig: (_file: ConfigFile) => void;
  reloadSelectedConfig: () => Promise<void>;
  updateContent: (_content: string) => void;
  saveConfig: () => Promise<void>;
}

export function useConfigFiles(projectPath: string): UseConfigFilesReturn {
  // The open file lives in the URL (?file=) so it survives reloads and can be linked.
  const requestedFile = useSearchParam("file");
  const [configFiles, setConfigFiles] = useState<ConfigFile[] | null>(null);
  const loadedFile = useRef<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<ConfigFile | null>(null);
  const [configContent, setConfigContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const loadConfigFiles = useCallback(async () => {
    try {
      const response = await fetch(`/api/config/list?project=${encodeURIComponent(projectPath)}`);
      const data = await response.json();

      if (data.success) {
        setConfigFiles(data.files);
      }
    } catch (error) {
      console.error("Error loading config files:", error);
    }
  }, [projectPath]);

  useEffect(() => {
    loadConfigFiles();
  }, [loadConfigFiles]);

  const loadConfig = useCallback(
    async (configFile: ConfigFile) => {
      loadedFile.current = configFile.name;
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/config/read?project=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(configFile.name)}`
        );
        const data = await response.json();

        if (data.success) {
          setConfigContent(data.content);
          setSelectedConfig(configFile);
          setSaveError("");
        } else {
          console.error("Failed to load config:", data.error);
        }
      } catch (error) {
        console.error("Error loading config content:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [projectPath]
  );

  useEffect(() => {
    if (!requestedFile) {
      loadedFile.current = null;
      setSelectedConfig(null);
      setConfigContent("");
      return;
    }
    if (!configFiles || loadedFile.current === requestedFile) return;

    const configFile = configFiles.find((file) => file.name === requestedFile);
    if (configFile?.enabled) {
      loadConfig(configFile);
    } else {
      setSearchParam("file", null, { replace: true });
    }
  }, [requestedFile, configFiles, loadConfig]);

  const selectConfig = useCallback((configFile: ConfigFile) => {
    if (!configFile.enabled) return;
    setSearchParam("file", configFile.name);
  }, []);

  const reloadSelectedConfig = useCallback(async () => {
    if (selectedConfig) await loadConfig(selectedConfig);
  }, [selectedConfig, loadConfig]);

  const updateContent = useCallback((content: string) => {
    setConfigContent(content);
  }, []);

  const saveConfig = useCallback(async () => {
    if (!selectedConfig) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/config/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: projectPath,
          file: selectedConfig.name,
          content: configContent,
        }),
      });

      const data = await response.json();
      setSaveError(data.success ? "" : data.error || "Failed to save configuration");
    } catch (error) {
      console.error("Error saving config:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  }, [selectedConfig, projectPath, configContent]);

  return {
    configFiles: configFiles ?? [],
    selectedConfig,
    configContent,
    isLoading,
    isSaving,
    saveError,
    loadConfigFiles,
    selectConfig,
    reloadSelectedConfig,
    updateContent,
    saveConfig,
  };
}

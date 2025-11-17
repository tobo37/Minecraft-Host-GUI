import { useState, useEffect, useCallback } from "react";

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
  loadConfigFiles: () => Promise<void>;
  selectConfig: (_file: ConfigFile) => Promise<void>;
  updateContent: (_content: string) => void;
  saveConfig: () => Promise<void>;
}

export function useConfigFiles(projectPath: string): UseConfigFilesReturn {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ConfigFile | null>(null);
  const [configContent, setConfigContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const selectConfig = useCallback(
    async (configFile: ConfigFile) => {
      if (!configFile.enabled) return;

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/config/read?project=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(configFile.name)}`
        );
        const data = await response.json();

        if (data.success) {
          setConfigContent(data.content);
          setSelectedConfig(configFile);
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
      if (data.success) {
        // Config saved successfully
      }
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedConfig, projectPath, configContent]);

  return {
    configFiles,
    selectedConfig,
    configContent,
    isLoading,
    isSaving,
    loadConfigFiles,
    selectConfig,
    updateContent,
    saveConfig,
  };
}

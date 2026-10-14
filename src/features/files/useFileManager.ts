import { useState, useEffect, useCallback, useRef } from "react";
import { setSearchParam, useSearchParam } from "@/lib/router";

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: string;
}

export type FileNotice = { type: "success" | "error"; message: string } | null;

interface ApiResult {
  success: boolean;
  error?: string;
  status: number;
  [key: string]: unknown;
}

async function callApi(input: string, init?: RequestInit): Promise<ApiResult> {
  try {
    const response = await fetch(input, init);
    const data = await response.json().catch(() => ({ success: false, error: response.statusText }));
    return { ...data, status: response.status };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

function postJson(url: string, body: unknown): Promise<ApiResult> {
  return callApi(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function useFileManager(projectPath: string) {
  // The URL (?path=) is the source of truth for the open folder, so folders can be linked and
  // the browser history steps through visited folders.
  const requestedPath = useSearchParam("path") ?? "";
  const [currentPath, setCurrentPath] = useState("");
  const latestRequest = useRef(0);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<FileNotice>(null);

  const query = useCallback(
    (path: string) =>
      `project=${encodeURIComponent(projectPath)}&path=${encodeURIComponent(path)}`,
    [projectPath]
  );

  const loadEntries = useCallback(
    async (path: string) => {
      const request = ++latestRequest.current;
      setIsLoading(true);
      const result = await callApi(`/api/files/list?${query(path)}`);
      // Ignore responses that were overtaken by a newer navigation.
      if (request !== latestRequest.current) return false;
      setIsLoading(false);

      if (result.success) {
        setEntries(result.entries as FileEntry[]);
        setCurrentPath(path);
        return true;
      }

      setNotice({ type: "error", message: result.error || "Failed to load files" });
      return false;
    },
    [query]
  );

  useEffect(() => {
    loadEntries(requestedPath).then((loaded) => {
      // A stale or mistyped folder link falls back to the root; the error notice stays visible.
      if (!loaded && requestedPath) {
        setSearchParam("path", null, { replace: true });
      }
    });
  }, [loadEntries, requestedPath]);

  const refresh = useCallback(() => loadEntries(currentPath), [loadEntries, currentPath]);

  const navigateTo = useCallback(
    (path: string) => {
      if (path === requestedPath) {
        loadEntries(path);
      } else {
        setSearchParam("path", path || null);
      }
    },
    [loadEntries, requestedPath]
  );

  const navigateUp = useCallback(() => {
    navigateTo(currentPath.split("/").slice(0, -1).join("/"));
  }, [currentPath, navigateTo]);

  const ensureDirectory = useCallback(
    async (path: string) => {
      const exists = await callApi(`/api/files/list?${query(path)}`);
      if (exists.success) return true;

      const segments = path.split("/");
      const created = await postJson("/api/files/mkdir", {
        project: projectPath,
        path: segments.slice(0, -1).join("/"),
        name: segments[segments.length - 1],
      });
      return created.success;
    },
    [projectPath, query]
  );

  /**
   * Open a quick-access folder (mods/, config/), creating it if missing
   */
  const openFolder = useCallback(
    async (path: string) => {
      if (await ensureDirectory(path)) {
        navigateTo(path);
      } else {
        setNotice({ type: "error", message: `Folder "${path}" could not be opened` });
      }
    },
    [ensureDirectory, navigateTo]
  );

  const uploadFile = useCallback(
    async (file: File, overwrite: boolean) => {
      return callApi(
        `/api/files/upload?${query(currentPath)}&fileName=${encodeURIComponent(file.name)}&overwrite=${overwrite}`,
        {
          method: "POST",
          body: file,
          headers: { "Content-Type": "application/octet-stream" },
        }
      );
    },
    [query, currentPath]
  );

  const downloadFromUrl = useCallback(
    async (url: string, fileName: string, overwrite: boolean) => {
      return postJson("/api/files/download-url", {
        project: projectPath,
        path: currentPath,
        url,
        fileName: fileName || undefined,
        overwrite,
      });
    },
    [projectPath, currentPath]
  );

  const deleteEntry = useCallback(
    async (entry: FileEntry) => {
      return callApi(`/api/files/delete?${query(entry.path)}`, { method: "DELETE" });
    },
    [query]
  );

  const renameEntry = useCallback(
    async (entry: FileEntry, newName: string) => {
      return postJson("/api/files/rename", { project: projectPath, path: entry.path, newName });
    },
    [projectPath]
  );

  const createFolder = useCallback(
    async (name: string) => {
      return postJson("/api/files/mkdir", { project: projectPath, path: currentPath, name });
    },
    [projectPath, currentPath]
  );

  const readFile = useCallback(
    async (entry: FileEntry) => callApi(`/api/files/read?${query(entry.path)}`),
    [query]
  );

  const saveFile = useCallback(
    async (entry: FileEntry, content: string) => {
      return postJson("/api/files/save", { project: projectPath, path: entry.path, content });
    },
    [projectPath]
  );

  const getDownloadUrl = useCallback(
    (entry: FileEntry) => `/api/files/download?${query(entry.path)}`,
    [query]
  );

  /**
   * Run a mutating action with busy state, notice and list refresh
   */
  const runAction = useCallback(
    async (action: () => Promise<ApiResult>, successMessage: string) => {
      setIsBusy(true);
      setNotice(null);
      const result = await action();
      setIsBusy(false);

      setNotice(
        result.success
          ? { type: "success", message: successMessage }
          : { type: "error", message: result.error || "Unknown error" }
      );
      await loadEntries(currentPath);
      return result;
    },
    [loadEntries, currentPath]
  );

  return {
    currentPath,
    entries,
    isLoading,
    isBusy,
    notice,
    setNotice,
    setIsBusy,
    refresh,
    navigateTo,
    navigateUp,
    openFolder,
    uploadFile,
    downloadFromUrl,
    deleteEntry,
    renameEntry,
    createFolder,
    readFile,
    saveFile,
    getDownloadUrl,
    runAction,
  };
}

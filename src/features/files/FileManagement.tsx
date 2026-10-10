import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/useLanguage";
import type { ServerStatus } from "@/services/types";
import { useFileManager, type FileEntry } from "./useFileManager";
import { FileTable } from "./FileTable";
import { FileEditorDialog } from "./FileEditorDialog";

interface FileManagementProps {
  projectPath: string;
  serverStatus: ServerStatus;
  onBack: () => void;
}

function format(template: string, name: string): string {
  return template.replace("{name}", name);
}

/**
 * Collect dropped files synchronously (the browser empties dataTransfer once
 * the event returns). Folders cannot be uploaded and are reported separately.
 */
function collectDroppedFiles(dataTransfer: DataTransfer): { files: File[]; folders: string[] } {
  const files: File[] = [];
  const folders: string[] = [];

  if (dataTransfer.items && dataTransfer.items.length > 0) {
    for (const item of Array.from(dataTransfer.items)) {
      if (item.kind !== "file") continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        folders.push(entry.name);
        continue;
      }
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    return { files, folders };
  }

  return { files: Array.from(dataTransfer.files), folders };
}

export function FileManagement({ projectPath, serverStatus, onBack }: FileManagementProps) {
  const { translations } = useLanguage();
  const t = translations.fileManagement;
  const files = useFileManager(projectPath);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkFileName, setLinkFileName] = useState("");
  const [busyLabel, setBusyLabel] = useState("");

  // Editor state
  const [editingEntry, setEditingEntry] = useState<FileEntry | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState("");

  const segments = files.currentPath ? files.currentPath.split("/") : [];
  const inModsFolder = segments[segments.length - 1] === "mods";
  const isServerActive = serverStatus === "running" || serverStatus === "starting";

  const handleUpload = async (selected: File[], skippedFolders: string[] = []) => {
    if (selected.length === 0) {
      files.setNotice({
        type: "error",
        message: skippedFolders.length > 0 ? t.folderDropNotSupported : t.noFilesDropped,
      });
      return;
    }

    files.setIsBusy(true);
    files.setNotice(null);

    const uploaded: string[] = [];
    const failed: string[] = skippedFolders.map((name) => `${name}: ${t.folderDropNotSupported}`);
    const skipped: string[] = [];

    for (const [index, file] of selected.entries()) {
      setBusyLabel(`${t.uploading} (${index + 1}/${selected.length}) ${file.name}`);

      let result = await files.uploadFile(file, false);
      if (result.status === 409) {
        if (!window.confirm(format(t.overwriteConfirm, file.name))) {
          skipped.push(file.name);
          continue;
        }
        result = await files.uploadFile(file, true);
      }

      if (result.success) {
        uploaded.push(file.name);
      } else {
        failed.push(`${file.name}: ${result.error || "Upload failed"}`);
      }
    }

    files.setIsBusy(false);
    setBusyLabel("");

    const lines = [
      uploaded.length > 0 ? format(t.success.uploaded, uploaded.join(", ")) : "",
      skipped.length > 0 ? format(t.uploadSkipped, skipped.join(", ")) : "",
      ...failed,
    ].filter(Boolean);

    files.setNotice({ type: failed.length > 0 ? "error" : "success", message: lines.join("\n") });
    await files.refresh();
  };

  // The whole page is a drop target, so a file dropped next to the box
  // is still uploaded instead of being opened by the browser.
  const handleUploadRef = useRef(handleUpload);
  handleUploadRef.current = handleUpload;
  const isBusyRef = useRef(files.isBusy);
  isBusyRef.current = files.isBusy;

  useEffect(() => {
    let dragDepth = 0;
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types || []).includes("Files");

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth += 1;
      setIsDragging(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setIsDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth = 0;
      setIsDragging(false);
      if (!event.dataTransfer || isBusyRef.current) return;

      const dropped = collectDroppedFiles(event.dataTransfer);
      handleUploadRef.current(dropped.files, dropped.folders);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const handleDownloadFromLink = async () => {
    const url = linkUrl.trim();
    if (!url) return;

    files.setIsBusy(true);
    files.setNotice(null);
    setBusyLabel(t.downloading);

    let result = await files.downloadFromUrl(url, linkFileName.trim(), false);
    if (result.status === 409) {
      const name = linkFileName.trim() || url.split("/").pop() || url;
      if (window.confirm(format(t.overwriteConfirm, name))) {
        result = await files.downloadFromUrl(url, linkFileName.trim(), true);
      }
    }

    files.setIsBusy(false);
    setBusyLabel("");

    if (result.success) {
      files.setNotice({
        type: "success",
        message: format(t.success.downloaded, String(result.fileName || "")),
      });
      setLinkUrl("");
      setLinkFileName("");
    } else if (result.status !== 409) {
      files.setNotice({ type: "error", message: result.error || "Download failed" });
    }
    await files.refresh();
  };

  const handleDelete = (entry: FileEntry) => {
    if (!window.confirm(format(t.deleteConfirm, entry.name))) return;
    files.runAction(() => files.deleteEntry(entry), format(t.success.deleted, entry.name));
  };

  const handleRename = (entry: FileEntry) => {
    const newName = window.prompt(t.renamePrompt, entry.name)?.trim();
    if (!newName || newName === entry.name) return;
    files.runAction(() => files.renameEntry(entry, newName), format(t.success.renamed, newName));
  };

  const handleToggleDisabled = (entry: FileEntry) => {
    const newName = entry.name.toLowerCase().endsWith(".disabled")
      ? entry.name.slice(0, -".disabled".length)
      : `${entry.name}.disabled`;
    files.runAction(() => files.renameEntry(entry, newName), format(t.success.renamed, newName));
  };

  const handleNewFolder = () => {
    const name = window.prompt(t.newFolderPrompt)?.trim();
    if (!name) return;
    files.runAction(() => files.createFolder(name), format(t.success.folderCreated, name));
  };

  const handleDownload = (entry: FileEntry) => {
    const link = document.createElement("a");
    link.href = files.getDownloadUrl(entry);
    link.download = entry.name;
    link.click();
  };

  const handleEdit = async (entry: FileEntry) => {
    setEditingEntry(entry);
    setEditorContent("");
    setSavedContent("");
    setEditorError("");
    setEditorLoading(true);

    const result = await files.readFile(entry);
    setEditorLoading(false);

    if (result.success) {
      setEditorContent(String(result.content));
      setSavedContent(String(result.content));
    } else {
      setEditorError(result.error || "Failed to read file");
    }
  };

  const handleSave = async () => {
    if (!editingEntry) return;
    setEditorSaving(true);
    setEditorError("");

    const result = await files.saveFile(editingEntry, editorContent);
    setEditorSaving(false);

    if (result.success) {
      setSavedContent(editorContent);
      await files.refresh();
    } else {
      setEditorError(result.error || "Failed to save file");
    }
  };

  const handleCloseEditor = () => {
    if (editorContent !== savedContent && !window.confirm(t.unsavedChanges)) return;
    setEditingEntry(null);
  };

  return (
    <div className="app-page p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-4">
          <Button variant="outline" onClick={onBack} className="mb-4">
            {t.back}
          </Button>
        </div>

        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 text-primary">📁</div>
            </div>
            <CardTitle className="text-3xl font-bold text-primary">{t.title}</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              {t.project}: {projectPath}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isServerActive && (
              <div className="text-sm bg-accent/40 p-3 rounded">⚠️ {t.runningWarning}</div>
            )}

            {/* Quick access and toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1">{t.quickAccess}:</span>
              <Button size="sm" variant="outline" onClick={() => files.navigateTo("")}>
                🏠 {t.root}
              </Button>
              <Button size="sm" variant="outline" onClick={() => files.openFolder("mods")}>
                🧩 {t.mods}
              </Button>
              <Button size="sm" variant="outline" onClick={() => files.openFolder("config")}>
                ⚙️ {t.config}
              </Button>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={handleNewFolder} disabled={files.isBusy}>
                ➕ {t.newFolder}
              </Button>
              <Button size="sm" variant="outline" onClick={files.refresh} title={t.refresh}>
                🔄
              </Button>
            </div>

            {/* Breadcrumbs */}
            <div className="flex flex-wrap items-center gap-1 text-sm bg-muted/50 rounded px-3 py-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={files.navigateUp}
                disabled={!files.currentPath}
                title={t.up}
              >
                ⬆️
              </Button>
              <button
                type="button"
                className="font-medium hover:underline"
                onClick={() => files.navigateTo("")}
              >
                {t.root}
              </button>
              {segments.map((segment, index) => (
                <span key={index} className="flex items-center gap-1">
                  <span className="text-muted-foreground">/</span>
                  <button
                    type="button"
                    className="font-medium hover:underline break-all"
                    onClick={() => files.navigateTo(segments.slice(0, index + 1).join("/"))}
                  >
                    {segment}
                  </button>
                </span>
              ))}
            </div>

            {/* Upload and link import */}
            <div
              className={`rounded-md border-2 border-dashed p-4 space-y-3 transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => fileInputRef.current?.click()} disabled={files.isBusy}>
                  ⬆️ {t.upload}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {inModsFolder ? t.modsHint : t.uploadHint}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleUpload(Array.from(e.target.files));
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder={t.linkPlaceholder}
                  className="flex-[3]"
                  disabled={files.isBusy}
                  onKeyDown={(e) => e.key === "Enter" && handleDownloadFromLink()}
                />
                <Input
                  value={linkFileName}
                  onChange={(e) => setLinkFileName(e.target.value)}
                  placeholder={t.linkFileNamePlaceholder}
                  className="flex-1"
                  disabled={files.isBusy}
                />
                <Button
                  variant="outline"
                  onClick={handleDownloadFromLink}
                  disabled={files.isBusy || !linkUrl.trim()}
                >
                  🔗 {busyLabel === t.downloading ? t.downloading : t.downloadLink}
                </Button>
              </div>

              {busyLabel && <div className="text-sm text-muted-foreground">⏳ {busyLabel}</div>}
            </div>

            {files.notice && (
              <div
                className={`text-sm p-3 rounded break-all whitespace-pre-line ${
                  files.notice.type === "success"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {files.notice.message}
              </div>
            )}

            <FileTable
              entries={files.entries}
              isLoading={files.isLoading}
              isBusy={files.isBusy}
              onOpenDirectory={(entry) => files.navigateTo(entry.path)}
              onEdit={handleEdit}
              onDownload={handleDownload}
              onRename={handleRename}
              onToggleDisabled={handleToggleDisabled}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      </div>

      {isDragging && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-primary/10 backdrop-blur-sm pointer-events-none">
          <div className="rounded-lg border-2 border-dashed border-primary bg-card px-8 py-6 text-lg font-medium shadow-2xl">
            ⬆️ {format(t.dropHere, files.currentPath || t.root)}
          </div>
        </div>
      )}

      <FileEditorDialog
        filePath={editingEntry?.path ?? null}
        content={editorContent}
        isDirty={editorContent !== savedContent}
        isLoading={editorLoading}
        isSaving={editorSaving}
        error={editorError}
        onContentChange={setEditorContent}
        onSave={handleSave}
        onClose={handleCloseEditor}
      />
    </div>
  );
}

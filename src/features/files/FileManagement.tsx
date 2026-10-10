import { useRef, useState, type DragEvent } from "react";
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

  const handleUpload = async (fileList: FileList | File[]) => {
    const selected = Array.from(fileList);
    if (selected.length === 0) return;

    files.setIsBusy(true);
    files.setNotice(null);
    setBusyLabel(t.uploading);

    const uploaded: string[] = [];
    let error = "";

    for (const file of selected) {
      let result = await files.uploadFile(file, false);
      if (result.status === 409 && window.confirm(format(t.overwriteConfirm, file.name))) {
        result = await files.uploadFile(file, true);
      }
      if (result.success) {
        uploaded.push(file.name);
      } else if (result.status !== 409) {
        error = `${file.name}: ${result.error}`;
      }
    }

    files.setIsBusy(false);
    setBusyLabel("");
    files.setNotice(
      error
        ? { type: "error", message: error }
        : uploaded.length > 0
          ? { type: "success", message: format(t.success.uploaded, uploaded.join(", ")) }
          : null
    );
    await files.refresh();
  };

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

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!files.isBusy && event.dataTransfer.files.length > 0) {
      handleUpload(event.dataTransfer.files);
    }
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
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
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
                    if (e.target.files) handleUpload(e.target.files);
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
                className={`text-sm p-3 rounded break-all ${
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

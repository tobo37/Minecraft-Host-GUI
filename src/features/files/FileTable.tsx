import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import type { FileEntry } from "./useFileManager";

interface FileTableProps {
  entries: FileEntry[];
  isLoading: boolean;
  isBusy: boolean;
  onOpenDirectory: (_entry: FileEntry) => void;
  onEdit: (_entry: FileEntry) => void;
  onDownload: (_entry: FileEntry) => void;
  onRename: (_entry: FileEntry) => void;
  onToggleDisabled: (_entry: FileEntry) => void;
  onDelete: (_entry: FileEntry) => void;
}

const EDITABLE_EXTENSIONS = [
  ".txt", ".json", ".json5", ".toml", ".cfg", ".conf", ".properties", ".yml", ".yaml",
  ".ini", ".log", ".md", ".js", ".zs", ".mcmeta", ".snbt", ".sh", ".bat", ".cmd", ".csv", ".xml",
];

export function isEditable(name: string): boolean {
  const lower = name.toLowerCase();
  return EDITABLE_EXTENSIONS.some((ext) => lower.endsWith(ext)) || !lower.includes(".");
}

export function isModFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".jar") || lower.endsWith(".jar.disabled");
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function FileTable({
  entries,
  isLoading,
  isBusy,
  onOpenDirectory,
  onEdit,
  onDownload,
  onRename,
  onToggleDisabled,
  onDelete,
}: FileTableProps) {
  const { translations, language } = useLanguage();
  const t = translations.fileManagement;

  if (!isLoading && entries.length === 0) {
    return <div className="text-center text-muted-foreground py-12">{t.emptyFolder}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-3 py-2">{t.name}</th>
            <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">{t.size}</th>
            <th className="text-left font-medium px-3 py-2 hidden md:table-cell">{t.modified}</th>
            <th className="text-right font-medium px-3 py-2">{t.actions}</th>
          </tr>
        </thead>
        <tbody className={isLoading ? "opacity-50" : ""}>
          {entries.map((entry) => {
            const isDirectory = entry.type === "directory";
            const isDisabledMod = entry.name.toLowerCase().endsWith(".jar.disabled");

            return (
              <tr key={entry.path} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 break-all">
                  {isDirectory ? (
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline text-left"
                      onClick={() => onOpenDirectory(entry)}
                    >
                      📁 {entry.name}
                    </button>
                  ) : (
                    <span className={isDisabledMod ? "text-muted-foreground line-through" : ""}>
                      {isModFile(entry.name) ? "🧩" : "📄"} {entry.name}
                    </span>
                  )}
                  {isDisabledMod && (
                    <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {t.disabled}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap hidden sm:table-cell text-muted-foreground">
                  {isDirectory ? "–" : formatSize(entry.size)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell text-muted-foreground">
                  {new Date(entry.modified).toLocaleString(language === "de" ? "de-DE" : "en-US")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1 flex-wrap">
                    {!isDirectory && isEditable(entry.name) && (
                      <Button size="sm" variant="outline" disabled={isBusy} onClick={() => onEdit(entry)}>
                        ✏️ <span className="hidden lg:inline">{t.edit}</span>
                      </Button>
                    )}
                    {!isDirectory && (
                      <Button size="sm" variant="outline" title={t.download} onClick={() => onDownload(entry)}>
                        ⬇️
                      </Button>
                    )}
                    {isModFile(entry.name) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => onToggleDisabled(entry)}
                      >
                        {isDisabledMod ? t.enable : t.disable}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      title={t.rename}
                      disabled={isBusy}
                      onClick={() => onRename(entry)}
                    >
                      🏷️
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      title={t.delete}
                      disabled={isBusy}
                      onClick={() => onDelete(entry)}
                    >
                      🗑️
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

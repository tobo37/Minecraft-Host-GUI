import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";

interface FileEditorDialogProps {
  filePath: string | null;
  content: string;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  onContentChange: (_content: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function FileEditorDialog({
  filePath,
  content,
  isDirty,
  isLoading,
  isSaving,
  error,
  onContentChange,
  onSave,
  onClose,
}: FileEditorDialogProps) {
  const { translations } = useLanguage();
  const t = translations.fileManagement;

  return (
    <Dialog open={filePath !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="break-all">{filePath?.split("/").pop()}</DialogTitle>
          <DialogDescription className="break-all">{filePath}</DialogDescription>
        </DialogHeader>

        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
              e.preventDefault();
              onSave();
            }
          }}
          className="min-h-[60vh] font-mono text-sm"
          spellCheck={false}
          disabled={isLoading}
        />

        {error && <div className="text-sm text-destructive">{error}</div>}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t.close}
          </Button>
          <Button onClick={onSave} disabled={isSaving || isLoading || !isDirty}>
            {isSaving ? t.saving : isDirty ? t.save : t.saved}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

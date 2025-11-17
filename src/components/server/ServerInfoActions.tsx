import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import type { Server } from "@/services/types";

interface ServerInfoActionsProps {
  serverInfo: Server | null;
  isEditingDescription: boolean;
  newDescription: string;
  onEditDescriptionClick: () => void;
  onDescriptionChange: (value: string) => void;
  onCancelDescription: () => void;
  onSaveDescription: () => void;
}

export function ServerInfoActions({
  serverInfo,
  isEditingDescription,
  newDescription,
  onEditDescriptionClick,
  onDescriptionChange,
  onCancelDescription,
  onSaveDescription,
}: ServerInfoActionsProps) {
  const { translations } = useLanguage();

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-muted-foreground">
          {translations.serverManagement.description}:
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={onEditDescriptionClick}
        >
          {translations.serverManagement.editDescriptionButton}
        </Button>
      </div>
      {isEditingDescription ? (
        <div className="space-y-2">
          <Textarea
            value={newDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe your server..."
            maxLength={500}
            rows={3}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {newDescription.length}/500
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelDescription}
              >
                {translations.serverManagement.renameDialog.cancel}
              </Button>
              <Button size="sm" onClick={onSaveDescription}>
                {translations.serverManagement.renameDialog.save}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm">
          {serverInfo?.description || (
            <span className="text-muted-foreground italic">
              No description
            </span>
          )}
        </div>
      )}
    </div>
  );
}

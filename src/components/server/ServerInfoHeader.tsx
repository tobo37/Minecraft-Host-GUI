import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import type { Server } from "@/services/types";

interface ServerInfoHeaderProps {
  serverInfo: Server | null;
  projectPath: string;
  onRenameClick: () => void;
}

export function ServerInfoHeader({
  serverInfo,
  projectPath,
  onRenameClick,
}: ServerInfoHeaderProps) {
  const { translations } = useLanguage();

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-muted-foreground">
          {translations.serverManagement.customName}:
        </Label>
        <Button variant="outline" size="sm" onClick={onRenameClick}>
          {translations.serverManagement.renameButton}
        </Button>
      </div>
      <div className="font-semibold text-base">
        {serverInfo?.customName || serverInfo?.name || projectPath}
      </div>
    </div>
  );
}

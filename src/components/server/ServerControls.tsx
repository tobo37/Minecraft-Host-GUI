import { Button } from "@/components/ui/button";
import { ServerControlButtons } from "./ServerControlButtons";

type ServerStatus = "stopped" | "starting" | "running" | "stopping";

interface ServerControlsProps {
  serverStatus: ServerStatus;
  onStart: () => void;
  onStop: () => void;
  onFindStartFiles: () => void;
  onConfiguration: () => void;
  onRcon: () => void;
}

export function ServerControls({
  serverStatus,
  onStart,
  onStop,
  onFindStartFiles,
  onConfiguration,
  onRcon,
}: ServerControlsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex gap-2">
        <ServerControlButtons
          serverStatus={serverStatus}
          onStart={onStart}
          onStop={onStop}
          onFindStartFiles={onFindStartFiles}
        />
      </div>

      <Button
        size="lg"
        variant="outline"
        className="h-16"
        onClick={onConfiguration}
      >
        ⚙️ Konfiguration
      </Button>
      <Button size="lg" variant="outline" className="h-16">
        📁 Dateien verwalten
      </Button>
      <Button 
        size="lg" 
        variant="outline" 
        className="h-16"
        onClick={onRcon}
      >
        🎮 RCON Console
      </Button>
    </div>
  );
}

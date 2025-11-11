import { Button } from "@/components/ui/button";

type ServerStatus = "stopped" | "starting" | "running" | "stopping";

interface ServerControlsProps {
  serverStatus: ServerStatus;
  onStart: () => void;
  onStop: () => void;
  onFindStartFiles: () => void;
  onConfiguration: () => void;
}

export function ServerControls({
  serverStatus,
  onStart,
  onStop,
  onFindStartFiles,
  onConfiguration,
}: ServerControlsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex gap-2">
        {serverStatus === "stopped" || serverStatus === "starting" ? (
          <>
            <Button
              size="lg"
              className="h-16 flex-1"
              onClick={onStart}
              disabled={serverStatus === "starting"}
            >
              🚀{" "}
              {serverStatus === "starting" ? "Startet..." : "Server starten"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-16 px-4"
              onClick={onFindStartFiles}
              title="Startdatei suchen"
            >
              🔍
            </Button>
          </>
        ) : (
          <Button
            size="lg"
            className="h-16 flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
            onClick={onStop}
            disabled={serverStatus === "stopping"}
          >
            🛑 {serverStatus === "stopping" ? "Stoppt..." : "Server stoppen"}
          </Button>
        )}
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
      <Button size="lg" variant="outline" className="h-16">
        📊 Logs anzeigen
      </Button>
    </div>
  );
}

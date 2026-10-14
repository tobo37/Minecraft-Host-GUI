import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

type ServerStatus = "stopped" | "starting" | "running" | "stopping";

interface ServerControlButtonsProps {
  serverStatus: ServerStatus;
  onStart: () => void;
  onShutdown: () => void;
  onKill: () => void;
  onFindStartFiles: () => void;
}

export function ServerControlButtons({
  serverStatus,
  onStart,
  onShutdown,
  onKill,
  onFindStartFiles,
}: ServerControlButtonsProps) {
  const t = useLanguage().translations.serverManagement.controls;
  const isStarting = serverStatus === "starting";
  const isStopping = serverStatus === "stopping";
  const isRunning = serverStatus === "running" || isStopping;

  if (isRunning) {
    return (
      <>
        <Button
          size="lg"
          className="h-16 flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
          onClick={onShutdown}
          disabled={isStopping}
          title={t.shutdownTooltip}
        >
          💾 {isStopping ? t.shuttingDown : t.shutdown}
        </Button>
        {/* Kill stays enabled while stopping, to end a shutdown that hangs */}
        <Button
          size="lg"
          variant="outline"
          className="h-16 px-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={onKill}
          title={t.killTooltip}
          aria-label={t.killTooltip}
        >
          ⏹️
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        size="lg"
        className="h-16 flex-1"
        onClick={onStart}
        disabled={isStarting}
      >
        🚀 {isStarting ? "Startet..." : "Server starten"}
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
  );
}

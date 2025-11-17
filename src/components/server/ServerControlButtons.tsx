import { Button } from "@/components/ui/button";

type ServerStatus = "stopped" | "starting" | "running" | "stopping";

interface ServerControlButtonsProps {
  serverStatus: ServerStatus;
  onStart: () => void;
  onStop: () => void;
  onFindStartFiles: () => void;
}

export function ServerControlButtons({
  serverStatus,
  onStart,
  onStop,
  onFindStartFiles,
}: ServerControlButtonsProps) {
  const isStarting = serverStatus === "starting";
  const isStopping = serverStatus === "stopping";
  const isRunning = serverStatus === "running" || isStopping;

  if (isRunning) {
    return (
      <Button
        size="lg"
        className="h-16 flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
        onClick={onStop}
        disabled={isStopping}
      >
        🛑 {isStopping ? "Stoppt..." : "Server stoppen"}
      </Button>
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

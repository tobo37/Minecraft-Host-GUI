import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { useLanguage } from "@/hooks/useLanguage";
import { ServerControlButtons } from "./ServerControlButtons";

type ServerStatus = "stopped" | "starting" | "running" | "stopping";

interface ServerControlsProps {
  serverStatus: ServerStatus;
  onStart: () => void;
  onShutdown: () => void;
  onKill: () => void;
  onFindStartFiles: () => void;
  configurationHref: string;
  filesHref: string;
  rconHref: string;
}

export function ServerControls({
  serverStatus,
  onStart,
  onShutdown,
  onKill,
  onFindStartFiles,
  configurationHref,
  filesHref,
  rconHref,
}: ServerControlsProps) {
  const { translations } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex gap-2">
        <ServerControlButtons
          serverStatus={serverStatus}
          onStart={onStart}
          onShutdown={onShutdown}
          onKill={onKill}
          onFindStartFiles={onFindStartFiles}
        />
      </div>

      <Button asChild size="lg" variant="outline" className="h-16">
        <Link href={configurationHref}>⚙️ Konfiguration</Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="h-16">
        <Link href={filesHref}>📁 {translations.fileManagement.openButton}</Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="h-16">
        <Link href={rconHref}>🎮 RCON Console</Link>
      </Button>
    </div>
  );
}

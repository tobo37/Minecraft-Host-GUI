import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import type { ServerStatus } from "@/services/types";

interface KnownPlayer {
  name: string;
  uuid: string;
  lastSeen: string | null;
  isOp: boolean;
  opLevel: number | null;
  isWhitelisted: boolean;
}

interface KnownPlayersProps {
  projectPath: string;
  serverStatus?: ServerStatus;
  /** Called after ops.json or whitelist.json changed on disk */
  onFileChanged?: (_fileName: string) => void;
}

export function KnownPlayers({ projectPath, serverStatus, onFileChanged }: KnownPlayersProps) {
  const { translations, language } = useLanguage();
  const t = translations.players;

  const [players, setPlayers] = useState<KnownPlayer[]>([]);
  const [invalidFiles, setInvalidFiles] = useState<string[]>([]);
  const [busyUuid, setBusyUuid] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const loadPlayers = useCallback(async () => {
    try {
      const response = await fetch(`/api/players?project=${encodeURIComponent(projectPath)}`);
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
        setInvalidFiles(data.invalidFiles || []);
      } else {
        setNotice({ type: "error", message: data.error || "Failed to load players" });
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load players",
      });
    }
  }, [projectPath]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const update = async (player: KnownPlayer, fileName: string, endpoint: string, body: object) => {
    setBusyUuid(player.uuid);
    setNotice(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectPath, uuid: player.uuid, name: player.name, ...body }),
      });
      const data = await response.json();
      setNotice(
        data.success
          ? {
              type: "success",
              message: `${t.updated.replace("{name}", fileName)} ${t.restartHint}`,
            }
          : { type: "error", message: data.error || "Update failed" }
      );
      if (data.success) onFileChanged?.(fileName);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Update failed" });
    } finally {
      setBusyUuid(null);
      await loadPlayers();
    }
  };

  const isServerActive = serverStatus === "running" || serverStatus === "starting";

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center gap-2">
          <CardTitle className="text-lg">👥 {t.title}</CardTitle>
          <Button size="sm" variant="outline" onClick={loadPlayers} title={t.refresh}>
            🔄
          </Button>
        </div>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isServerActive && (
          <div className="text-sm bg-accent/40 p-3 rounded">⚠️ {t.runningHint}</div>
        )}

        {invalidFiles.map((fileName) => (
          <div key={fileName} className="text-sm text-destructive bg-destructive/10 p-3 rounded">
            {t.invalidFile.replace("{name}", fileName)}
          </div>
        ))}

        {notice && (
          <div
            className={`text-sm p-3 rounded ${
              notice.type === "success"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {notice.message}
          </div>
        )}

        {players.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">{t.empty}</div>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {players.map((player) => (
              <div
                key={player.uuid}
                className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{player.name}</span>
                    {player.isOp && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                        {t.op} {player.opLevel}
                      </span>
                    )}
                    {player.isWhitelisted && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                        {t.whitelisted}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground break-all">
                    {t.lastSeen}:{" "}
                    {player.lastSeen
                      ? new Date(player.lastSeen).toLocaleString(language === "de" ? "de-DE" : "en-US")
                      : t.never}{" "}
                    · {player.uuid}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={player.isOp ? "outline" : "default"}
                    disabled={busyUuid !== null}
                    onClick={() =>
                      update(player, "ops.json", "/api/players/op", { op: !player.isOp, level: 4 })
                    }
                  >
                    {player.isOp ? t.removeOp : t.makeOp}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyUuid !== null}
                    onClick={() =>
                      update(player, "whitelist.json", "/api/players/whitelist", {
                        whitelisted: !player.isWhitelisted,
                      })
                    }
                  >
                    {player.isWhitelisted ? t.removeWhitelist : t.addWhitelist}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServerLogs } from "@/components/server/ServerLogs";
import { useServerStatus } from "@/hooks/useServerStatus";

interface RconManagementProps {
  projectPath: string;
  onBack: () => void;
}

const MINECRAFT_COMMANDS = [
  "help",
  "stop",
  "list",
  "say",
  "tell",
  "give",
  "tp",
  "teleport",
  "gamemode",
  "difficulty",
  "time",
  "weather",
  "seed",
  "whitelist",
  "ban",
  "pardon",
  "kick",
  "op",
  "deop",
  "save-all",
  "save-on",
  "save-off",
];

export function RconManagement({ projectPath, onBack }: RconManagementProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);

  // Get server status and logs
  const { serverStatus, logs, isPollingLogs, startServer, stopServer } =
    useServerStatus(projectPath);

  const [command, setCommand] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [rconEnabled, setRconEnabled] = useState<boolean | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const [responses, setResponses] = useState<string[]>([]);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [rconPassword, setRconPassword] = useState("minecraft");
  const [rconPort, setRconPort] = useState(25575);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const isServerRunning = serverStatus === "running";

  useEffect(() => {
    checkRconStatus();
  }, [checkRconStatus, projectPath]);

  useEffect(() => {
    if (command.trim()) {
      const filtered = MINECRAFT_COMMANDS.filter((cmd) =>
        cmd.toLowerCase().startsWith(command.toLowerCase())
      );
      setSuggestions(filtered);
      setSelectedSuggestion(-1);
    } else {
      setSuggestions([]);
    }
  }, [command]);

  const responseContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll only within the response container, not the whole page
    if (responseContainerRef.current) {
      responseContainerRef.current.scrollTop =
        responseContainerRef.current.scrollHeight;
    }
  }, [responses]);

  const checkRconStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await fetch(
        `/api/server/rcon/status?project=${encodeURIComponent(projectPath)}`
      );
      const result = await res.json();
      setRconEnabled(result.enabled || false);
    } catch {
      setRconEnabled(false);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleEnableRcon = async () => {
    setIsEnabling(true);
    try {
      const res = await fetch(
        `/api/server/rcon/enable?project=${encodeURIComponent(projectPath)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ port: rconPort, password: rconPassword }),
        }
      );

      const result = await res.json();

      if (res.ok) {
        setRconEnabled(true);
        setShowPasswordField(false);
        setResponses([
          "✅ RCON wurde erfolgreich aktiviert!",
          "",
          "⚠️  WICHTIG: Der Server muss neu gestartet werden, damit RCON funktioniert.",
          "",
          "📝 Konfiguration:",
          `   • Port: ${rconPort}`,
          `   • Passwort: ${rconPassword}`,
          "",
          "Die Einstellungen wurden in server.properties gespeichert.",
        ]);
      } else {
        setResponses([`❌ Fehler beim Aktivieren: ${result.error}`]);
      }
    } catch (error) {
      setResponses([`❌ Fehler: ${error}`]);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleRestartServer = async () => {
    setIsRestarting(true);
    setResponses((prev) => [...prev, "", "🔄 Starte Server neu..."]);

    try {
      // Stop server
      await stopServer();
      setResponses((prev) => [...prev, "⏹️ Server wird gestoppt..."]);

      // Wait a bit for server to stop
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Start server
      await startServer();
      setResponses((prev) => [
        ...prev,
        "▶️ Server wird gestartet...",
        "",
        "✅ Server wurde neu gestartet. RCON sollte jetzt funktionieren.",
      ]);
    } catch (error) {
      setResponses((prev) => [...prev, `❌ Fehler beim Neustart: ${error}`]);
    } finally {
      setIsRestarting(false);
    }
  };

  const handleTestRcon = async () => {
    setResponses((prev) => [...prev, "", "🔍 Teste RCON-Verbindung..."]);

    try {
      const res = await fetch(
        `/api/server/rcon?project=${encodeURIComponent(projectPath)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: "list" }),
        }
      );

      const result = await res.json();

      if (res.ok) {
        setResponses((prev) => [
          ...prev,
          "✅ RCON funktioniert!",
          result.response || "",
        ]);
      } else {
        setResponses((prev) => [
          ...prev,
          "❌ RCON-Verbindung fehlgeschlagen",
          "",
          "🔍 Mögliche Ursachen:",
          "1. Server unterstützt kein RCON (manche Forge/Fabric-Versionen)",
          "2. Port 25575 ist blockiert (Firewall)",
          "3. Server wurde nicht korrekt neu gestartet",
          "",
          `Fehlerdetails: ${result.error}`,
        ]);
      }
    } catch (error) {
      setResponses((prev) => [...prev, `❌ Verbindungsfehler: ${error}`]);
    }
  };

  const handleSendCommand = async (useStdin = false, isRetry = false) => {
    if (!command.trim() || isSending) return;

    // Check if server is running
    if (!isServerRunning) {
      setResponses((prev) => [
        ...prev,
        "❌ Server läuft nicht. Starte den Server zuerst.",
      ]);
      return;
    }

    const currentCommand = command.trim();
    setIsSending(true);

    // Add command to responses immediately (only on first attempt)
    if (!isRetry) {
      setResponses((prev) => [...prev, `> ${currentCommand}`]);
      setCommand("");
      setSuggestions([]);
    }

    try {
      // Try RCON first if enabled, otherwise use stdin
      const endpoint =
        rconEnabled && !useStdin
          ? `/api/server/rcon?project=${encodeURIComponent(projectPath)}`
          : `/api/server/command?project=${encodeURIComponent(projectPath)}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: currentCommand }),
      });

      const result = await res.json();

      if (res.ok) {
        if (result.response) {
          setResponses((prev) => [...prev, result.response]);
        } else {
          setResponses((prev) => [...prev, "✓ Befehl gesendet"]);
        }
      } else {
        // If RCON fails and we haven't tried stdin yet, try stdin
        if (!useStdin && rconEnabled) {
          setIsSending(false);
          // Retry with stdin silently - no warning needed as fallback is expected
          await handleSendCommand(true, true);
          return;
        } else {
          setResponses((prev) => [...prev, `❌ Fehler: ${result.error}`]);
        }
      }
    } catch (error) {
      setResponses((prev) => [...prev, `❌ Verbindungsfehler: ${error}`]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendClick = () => {
    handleSendCommand(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
        setCommand(suggestions[selectedSuggestion]);
        setSuggestions([]);
        setSelectedSuggestion(-1);
      } else {
        handleSendClick();
      }
    } else if (e.key === "Tab" && suggestions.length > 0) {
      e.preventDefault();
      const nextIndex = (selectedSuggestion + 1) % suggestions.length;
      setSelectedSuggestion(nextIndex);
      setCommand(suggestions[nextIndex] || "");
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      const nextIndex = Math.min(
        selectedSuggestion + 1,
        suggestions.length - 1
      );
      setSelectedSuggestion(nextIndex);
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      const nextIndex = Math.max(selectedSuggestion - 1, 0);
      setSelectedSuggestion(nextIndex);
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setSelectedSuggestion(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-4">
          <Button variant="outline" onClick={onBack} className="mb-4">
            ← Zurück zur Übersicht
          </Button>
        </div>

        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              🎮 RCON Console
              {rconEnabled && (
                <span className="text-sm text-green-500 font-normal">
                  ● Aktiv
                </span>
              )}
              {rconEnabled === false && (
                <span className="text-sm text-yellow-500 font-normal">
                  ○ Inaktiv
                </span>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Server Logs - Always visible when server is running */}
            {isServerRunning && logs.length > 0 && (
              <ServerLogs logs={logs} isPolling={isPollingLogs} />
            )}

            {!isServerRunning && (
              <div className="bg-yellow-950/30 border border-yellow-700 rounded-lg p-4">
                <p className="text-yellow-200 text-sm">
                  ⚠️ Der Server läuft nicht. Starte den Server, um Befehle zu
                  senden.
                </p>
              </div>
            )}

            {isCheckingStatus ? (
              <div className="text-center py-8 text-muted-foreground">
                Prüfe RCON-Status...
              </div>
            ) : rconEnabled === false ? (
              <div className="space-y-4">
                <div className="bg-yellow-950/30 border border-yellow-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-200 mb-3">
                    RCON ist nicht aktiviert
                  </h3>
                  <p className="text-sm text-yellow-100 mb-4">
                    RCON (Remote Console) ermöglicht die erweiterte Verwaltung
                    deines Minecraft-Servers mit Features wie:
                  </p>
                  <ul className="text-sm text-yellow-100 space-y-2 mb-4 ml-4">
                    <li>• Befehle direkt an den Server senden</li>
                    <li>• Autocomplete für Minecraft-Befehle</li>
                    <li>• Sofortige Rückmeldung vom Server</li>
                    <li>• Keine Notwendigkeit, die Konsole zu öffnen</li>
                  </ul>
                  <div className="bg-yellow-900/50 border border-yellow-600 rounded p-3 mb-4">
                    <p className="text-xs text-yellow-200 mb-2">
                      ⚠️{" "}
                      <strong>
                        Wichtiger Hinweis zu Forge/Fabric-Servern:
                      </strong>
                    </p>
                    <p className="text-xs text-yellow-200">
                      Viele Forge- und Fabric-Modpacks unterstützen RCON nicht
                      oder nur eingeschränkt. Falls RCON nicht funktioniert,
                      werden Befehle automatisch über stdin gesendet. Du kannst
                      die Seite auch ohne RCON-Aktivierung nutzen!
                    </p>
                  </div>

                  {showPasswordField ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-yellow-200 mb-1 block">
                          RCON Port
                        </label>
                        <Input
                          type="number"
                          value={rconPort}
                          onChange={(e) =>
                            setRconPort(parseInt(e.target.value) || 25575)
                          }
                          className="bg-yellow-950/50 border-yellow-700 text-yellow-100"
                          placeholder="25575"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-yellow-200 mb-1 block">
                          RCON Passwort
                        </label>
                        <Input
                          type="text"
                          value={rconPassword}
                          onChange={(e) => setRconPassword(e.target.value)}
                          className="bg-yellow-950/50 border-yellow-700 text-yellow-100"
                          placeholder="minecraft"
                        />
                        <p className="text-xs text-yellow-300 mt-1">
                          Dieses Passwort wird in server.properties gespeichert
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleEnableRcon}
                          disabled={isEnabling || !rconPassword.trim()}
                          size="lg"
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          {isEnabling ? "Aktiviere..." : "✓ RCON aktivieren"}
                        </Button>
                        <Button
                          onClick={() => setShowPasswordField(false)}
                          disabled={isEnabling}
                          size="lg"
                          variant="outline"
                          className="border-yellow-700 text-yellow-400"
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowPasswordField(true)}
                      size="lg"
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      ⚡ RCON jetzt aktivieren
                    </Button>
                  )}
                </div>

                {responses.length > 0 && (
                  <div className="space-y-3">
                    <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
                      {responses.map((line, index) => (
                        <div key={index} className="mb-1">
                          {line}
                        </div>
                      ))}
                    </div>

                    {/* Show restart button if RCON was just enabled and server is running */}
                    {rconEnabled &&
                      isServerRunning &&
                      responses.some((r) => r.includes("WICHTIG")) && (
                        <Button
                          onClick={handleRestartServer}
                          disabled={isRestarting}
                          size="lg"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isRestarting
                            ? "🔄 Server wird neu gestartet..."
                            : "🔄 Server jetzt neu starten"}
                        </Button>
                      )}
                  </div>
                )}
              </div>
            ) : rconEnabled && isServerRunning ? (
              <div className="space-y-4">
                <div className="bg-green-950/30 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-200">
                      <span className="text-2xl">✓</span>
                      <div>
                        <p className="font-semibold">RCON ist aktiviert</p>
                        <p className="text-sm text-green-300">
                          Konfiguration in server.properties gespeichert
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleTestRcon}
                      variant="outline"
                      size="sm"
                      className="border-green-700 text-green-400 hover:bg-green-950"
                    >
                      🔍 Verbindung testen
                    </Button>
                  </div>
                </div>

                {responses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Server-Antworten
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        ref={responseContainerRef}
                        className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto"
                      >
                        {responses.map((line, index) => (
                          <div key={index} className="mb-1">
                            {line}
                          </div>
                        ))}
                        <div ref={responseEndRef} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Befehl senden</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            ref={inputRef}
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Minecraft-Befehl eingeben (z.B. 'list', 'help')..."
                            className="font-mono text-sm"
                            disabled={isSending}
                            autoComplete="off"
                          />
                          {suggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {suggestions.map((suggestion, index) => (
                                <div
                                  key={suggestion}
                                  className={`px-3 py-2 font-mono text-sm cursor-pointer ${
                                    index === selectedSuggestion
                                      ? "bg-accent text-accent-foreground"
                                      : "hover:bg-accent/50"
                                  }`}
                                  onClick={() => {
                                    setCommand(suggestion || "");
                                    setSuggestions([]);
                                    inputRef.current?.focus();
                                  }}
                                >
                                  {suggestion}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={handleSendClick}
                          disabled={!command.trim() || isSending}
                        >
                          {isSending ? "Sende..." : "Senden"}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        💡 Tipp: Nutze Tab oder ↑↓ für Autocomplete, Enter zum
                        Senden
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-semibold mb-2">
                        Häufige Befehle:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          "list",
                          "help",
                          "save-all",
                          "time set day",
                          "weather clear",
                          "gamemode survival",
                        ].map((cmd) => (
                          <Button
                            key={cmd}
                            variant="outline"
                            size="sm"
                            className="font-mono text-xs"
                            onClick={() => setCommand(cmd)}
                          >
                            {cmd}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : isServerRunning ? (
              <div className="space-y-4">
                <div className="bg-blue-950/30 border border-blue-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-200">
                    <span className="text-2xl">ℹ️</span>
                    <div>
                      <p className="font-semibold">RCON nicht aktiviert</p>
                      <p className="text-sm text-blue-300">
                        Befehle werden über stdin gesendet (keine
                        Server-Antworten)
                      </p>
                    </div>
                  </div>
                </div>

                {responses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Gesendete Befehle
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        ref={responseContainerRef}
                        className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto"
                      >
                        {responses.map((line, index) => (
                          <div key={index} className="mb-1">
                            {line}
                          </div>
                        ))}
                        <div ref={responseEndRef} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Befehl senden</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            ref={inputRef}
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Minecraft-Befehl eingeben (z.B. 'list', 'help')..."
                            className="font-mono text-sm"
                            disabled={isSending}
                            autoComplete="off"
                          />
                          {suggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {suggestions.map((suggestion, index) => (
                                <div
                                  key={suggestion}
                                  className={`px-3 py-2 font-mono text-sm cursor-pointer ${
                                    index === selectedSuggestion
                                      ? "bg-accent text-accent-foreground"
                                      : "hover:bg-accent/50"
                                  }`}
                                  onClick={() => {
                                    setCommand(suggestion || "");
                                    setSuggestions([]);
                                    inputRef.current?.focus();
                                  }}
                                >
                                  {suggestion}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={handleSendClick}
                          disabled={!command.trim() || isSending}
                        >
                          {isSending ? "Sende..." : "Senden"}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        💡 Tipp: Nutze Tab oder ↑↓ für Autocomplete, Enter zum
                        Senden
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-semibold mb-2">
                        Häufige Befehle:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          "list",
                          "help",
                          "save-all",
                          "time set day",
                          "weather clear",
                          "gamemode survival",
                        ].map((cmd) => (
                          <Button
                            key={cmd}
                            variant="outline"
                            size="sm"
                            className="font-mono text-xs"
                            onClick={() => setCommand(cmd)}
                          >
                            {cmd}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  RCON ist aktiviert, aber der Server läuft nicht. Starte den
                  Server, um Befehle zu senden.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

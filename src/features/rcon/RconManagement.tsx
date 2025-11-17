import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/useLanguage";
import { ServerLogs } from "@/components/server/ServerLogs";
import { useServerStatus } from "@/hooks/useServerStatus";

interface RconManagementProps {
  projectPath: string;
  onBack: () => void;
}

const MINECRAFT_COMMANDS = [
  'help', 'stop', 'list', 'say', 'tell', 'give', 'tp', 'teleport',
  'gamemode', 'difficulty', 'time', 'weather', 'seed', 'whitelist',
  'ban', 'pardon', 'kick', 'op', 'deop', 'save-all', 'save-on', 'save-off',
];

export function RconManagement({ projectPath, onBack }: RconManagementProps) {
  const { translations } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);
  
  // Get server status and logs
  const { serverStatus, logs, isPollingLogs } = useServerStatus(projectPath);
  
  const [command, setCommand] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [rconEnabled, setRconEnabled] = useState<boolean | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const [responses, setResponses] = useState<string[]>([]);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  
  const isServerRunning = serverStatus === "running";

  useEffect(() => {
    checkRconStatus();
  }, [projectPath]);

  useEffect(() => {
    if (command.trim()) {
      const filtered = MINECRAFT_COMMANDS.filter(cmd =>
        cmd.toLowerCase().startsWith(command.toLowerCase())
      );
      setSuggestions(filtered);
      setSelectedSuggestion(-1);
    } else {
      setSuggestions([]);
    }
  }, [command]);

  useEffect(() => {
    if (responseEndRef.current) {
      responseEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [responses]);

  const checkRconStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await fetch(`/api/server/rcon/status?project=${encodeURIComponent(projectPath)}`);
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
      const res = await fetch(`/api/server/rcon/enable?project=${encodeURIComponent(projectPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: 25575, password: 'minecraft' }),
      });

      const result = await res.json();
      
      if (res.ok) {
        setRconEnabled(true);
        setResponses([
          '✅ RCON wurde erfolgreich aktiviert!',
          '',
          '⚠️  WICHTIG: Bitte starte den Server neu, damit RCON funktioniert.',
          '',
          '📝 Konfiguration:',
          '   • Port: 25575',
          '   • Passwort: minecraft',
          '',
          'Die Einstellungen wurden in server.properties gespeichert.',
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

  const handleSendCommand = async () => {
    if (!command.trim() || isSending || !rconEnabled) return;

    const currentCommand = command.trim();
    setIsSending(true);
    
    // Add command to responses immediately
    setResponses(prev => [...prev, `> ${currentCommand}`]);
    setCommand("");
    setSuggestions([]);

    try {
      const res = await fetch(`/api/server/rcon?project=${encodeURIComponent(projectPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: currentCommand }),
      });

      const result = await res.json();
      
      if (res.ok) {
        if (result.response) {
          setResponses(prev => [...prev, result.response]);
        } else {
          setResponses(prev => [...prev, '✓ Befehl ausgeführt']);
        }
      } else {
        setResponses(prev => [...prev, `❌ Fehler: ${result.error}`]);
      }
    } catch (error) {
      setResponses(prev => [...prev, `❌ Verbindungsfehler: ${error}`]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
        setCommand(suggestions[selectedSuggestion]);
        setSuggestions([]);
        setSelectedSuggestion(-1);
      } else {
        handleSendCommand();
      }
    } else if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      const nextIndex = (selectedSuggestion + 1) % suggestions.length;
      setSelectedSuggestion(nextIndex);
      setCommand(suggestions[nextIndex] || '');
    } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      const nextIndex = Math.min(selectedSuggestion + 1, suggestions.length - 1);
      setSelectedSuggestion(nextIndex);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      const nextIndex = Math.max(selectedSuggestion - 1, 0);
      setSelectedSuggestion(nextIndex);
    } else if (e.key === 'Escape') {
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
                <span className="text-sm text-green-500 font-normal">● Aktiv</span>
              )}
              {rconEnabled === false && (
                <span className="text-sm text-yellow-500 font-normal">○ Inaktiv</span>
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
                  ⚠️ Der Server läuft nicht. Starte den Server, um RCON zu nutzen.
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
                    RCON (Remote Console) ermöglicht die erweiterte Verwaltung deines Minecraft-Servers
                    mit Features wie:
                  </p>
                  <ul className="text-sm text-yellow-100 space-y-2 mb-4 ml-4">
                    <li>• Befehle direkt an den Server senden</li>
                    <li>• Autocomplete für Minecraft-Befehle</li>
                    <li>• Sofortige Rückmeldung vom Server</li>
                    <li>• Keine Notwendigkeit, die Konsole zu öffnen</li>
                  </ul>
                  <Button
                    onClick={handleEnableRcon}
                    disabled={isEnabling}
                    size="lg"
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    {isEnabling ? 'Aktiviere RCON...' : '⚡ RCON jetzt aktivieren'}
                  </Button>
                </div>

                {responses.length > 0 && (
                  <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
                    {responses.map((line, index) => (
                      <div key={index} className="mb-1">
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : isServerRunning ? (
              <div className="space-y-4">
                <div className="bg-green-950/30 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-200">
                    <span className="text-2xl">✓</span>
                    <div>
                      <p className="font-semibold">RCON ist aktiv</p>
                      <p className="text-sm text-green-300">
                        Du kannst jetzt Befehle an den Server senden
                      </p>
                    </div>
                  </div>
                </div>

                {responses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Server-Antworten</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
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
                            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {suggestions.map((suggestion, index) => (
                                <div
                                  key={suggestion}
                                  className={`px-3 py-2 font-mono text-sm cursor-pointer ${
                                    index === selectedSuggestion
                                      ? 'bg-accent text-accent-foreground'
                                      : 'hover:bg-accent/50'
                                  }`}
                                  onClick={() => {
                                    setCommand(suggestion || '');
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
                          onClick={handleSendCommand}
                          disabled={!command.trim() || isSending}
                        >
                          {isSending ? 'Sende...' : 'Senden'}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        💡 Tipp: Nutze Tab oder ↑↓ für Autocomplete, Enter zum Senden
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-semibold mb-2">Häufige Befehle:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['list', 'help', 'save-all', 'time set day', 'weather clear', 'gamemode survival'].map(cmd => (
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
                  RCON ist aktiviert, aber der Server läuft nicht. Starte den Server, um Befehle zu senden.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

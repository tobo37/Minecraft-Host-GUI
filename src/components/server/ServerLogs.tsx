import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRef, useEffect } from "react";

interface ServerLogsProps {
  logs: string[];
  isPolling: boolean;
}

export function ServerLogs({ logs, isPolling }: ServerLogsProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const getLogLineClassName = (line: string) => {
    const isError =
      line.includes("[ERROR]") ||
      line.includes("ERROR:") ||
      line.includes("Exception") ||
      line.includes("java.lang.") ||
      line.includes("Caused by:");
    const isWarning =
      line.includes("[WARN]") ||
      line.includes("WARN:") ||
      line.includes("WARNING");
    const isInfo = line.includes("[INFO]") || line.includes("INFO:");
    const isServerMessage =
      line.includes("Server thread/") || line.includes("[Server thread]");
    const isPlayerJoin =
      line.includes("joined the game") || line.includes("left the game");
    const isCritical =
      line.includes("Server stopped") ||
      line.includes("exit code:") ||
      line.includes("Stopping server");

    let className = "whitespace-pre-wrap font-mono text-sm";

    if (isCritical) {
      className += " text-red-400 font-semibold";
    } else if (isError) {
      className += " text-red-300";
    } else if (isWarning) {
      className += " text-yellow-400";
    } else if (isPlayerJoin) {
      className += " text-blue-300";
    } else if (isServerMessage) {
      className += " text-green-300";
    } else if (isInfo) {
      className += " text-gray-300";
    } else {
      className += " text-green-400";
    }

    return className;
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          📋 Server Logs
          {isPolling && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">Warte auf Server-Logs...</div>
          ) : (
            logs.map((line, index) => (
              <div key={index} className={getLogLineClassName(line)}>
                {line}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </CardContent>
    </Card>
  );
}

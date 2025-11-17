import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRef, useEffect } from "react";
import { parseLogLineClassName } from "./logParser";

interface ServerLogsProps {
  logs: string[];
  isPolling: boolean;
}

export function ServerLogs({ logs, isPolling }: ServerLogsProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll only within the logs container, not the whole page
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

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
        <div 
          ref={logsContainerRef}
          className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto"
        >
          {logs.length === 0 ? (
            <div className="text-gray-500">Warte auf Server-Logs...</div>
          ) : (
            logs.map((line, index) => (
              <div key={index} className={parseLogLineClassName(line)}>
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

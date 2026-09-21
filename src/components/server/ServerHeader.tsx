import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Server } from "@/services/types";
import { useState, useEffect } from "react";

interface ServerHeaderProps {
  serverInfo: Server | null;
  projectPath: string;
  onJavaClick?: () => void;
}

export function ServerHeader({ serverInfo, projectPath, onJavaClick }: ServerHeaderProps) {
  const [javaVersion, setJavaVersion] = useState<string | null>(null);

  useEffect(() => {
    fetchJavaVersion();
  }, []);

  const fetchJavaVersion = async () => {
    try {
      const response = await fetch("/api/java/info");
      const data = await response.json();
      if (data.installed && data.version) {
        setJavaVersion(data.version);
      } else {
        setJavaVersion("Not installed");
      }
    } catch (error) {
      console.error("Error fetching Java version:", error);
      setJavaVersion("Unknown");
    }
  };

  return (
    <CardHeader className="text-center space-y-4">
      {onJavaClick && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onJavaClick}
            className="font-mono text-xs"
          >
            ☕ Java {javaVersion ? `(${javaVersion})` : ""}
          </Button>
        </div>
      )}
      <span className="grass-block mx-auto" aria-hidden="true" />
      <CardTitle className="text-3xl font-bold text-primary">
        {serverInfo?.customName || serverInfo?.name || projectPath}
      </CardTitle>
      <CardDescription className="text-lg text-muted-foreground">
        {serverInfo?.description || `Projekt: ${projectPath}`}
      </CardDescription>
    </CardHeader>
  );
}

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
        <div className="absolute top-4 right-4">
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
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <div className="w-8 h-8 bg-primary rounded-sm"></div>
      </div>
      <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        {serverInfo?.customName || serverInfo?.name || projectPath}
      </CardTitle>
      <CardDescription className="text-lg text-muted-foreground">
        {serverInfo?.description || `Projekt: ${projectPath}`}
      </CardDescription>
    </CardHeader>
  );
}

import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Server } from "@/services/types";

interface ServerHeaderProps {
  serverInfo: Server | null;
  projectPath: string;
}

export function ServerHeader({ serverInfo, projectPath }: ServerHeaderProps) {
  return (
    <CardHeader className="text-center space-y-4">
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

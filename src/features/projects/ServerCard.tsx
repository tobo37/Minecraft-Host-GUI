import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import type { Server } from "@/services/types";

interface ServerCardProps {
  server: Server;
  onSelect: (_path: string) => void;
}

export function ServerCard({ server, onSelect }: ServerCardProps) {
  const { translations } = useLanguage();

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] relative"
      onClick={() => onSelect(server.path)}
    >
      <CardContent className="p-6">
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <Badge
            variant={server.status === "running" ? "default" : "secondary"}
            className={
              server.status === "running"
                ? "bg-green-500 hover:bg-green-600"
                : "bg-gray-500 hover:bg-gray-600"
            }
          >
            {server.status === "running"
              ? translations.projectSelection.status.running
              : translations.projectSelection.status.stopped}
          </Badge>
        </div>

        {/* Custom Name as Primary Heading */}
        <h4 className="font-bold text-xl mb-2 pr-24">{server.customName || server.name}</h4>

        {/* Description (truncated if long) */}
        {server.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{server.description}</p>
        )}

        {/* Metadata Information */}
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-medium">{translations.projectSelection.createdLabel}:</span>{" "}
            {formatDate(server.createdAt)}
          </p>
          {server.sourceZipFile && (
            <p>
              <span className="font-medium">{translations.projectSelection.sourceLabel}:</span>{" "}
              {server.sourceZipFile}
            </p>
          )}
          <p>
            <span className="font-medium">{translations.projectSelection.pathLabel}:</span> server/
            {server.path}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

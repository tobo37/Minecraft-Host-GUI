import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/useLanguage";
import type { JavaInfo as JavaInfoType } from "./useJavaInfo";

interface JavaInfoProps {
  javaInfo: JavaInfoType | null;
}

export function JavaInfo({ javaInfo }: JavaInfoProps) {
  const { translations } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations.javaManagement.currentJava}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {javaInfo?.installed ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {translations.javaManagement.version}:
              </span>
              <span className="font-mono font-semibold">
                {javaInfo.version}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {translations.javaManagement.path}:
              </span>
              <span className="font-mono text-sm text-muted-foreground truncate max-w-md">
                {javaInfo.path}
              </span>
            </div>
          </>
        ) : (
          <Alert>
            <AlertDescription>
              {translations.javaManagement.noJava}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

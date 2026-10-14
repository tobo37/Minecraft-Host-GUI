import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Link } from "@/components/ui/link";
import { routes } from "@/lib/router";
import { useServerList } from "./useServerList";
import { ServerCard } from "./ServerCard";

export function ProjectSelection() {
  const { translations } = useLanguage();
  const { servers, loading } = useServerList();

  if (loading) {
    return (
      <div className="app-page flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="app-page p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center space-y-4">
            <span className="grass-block mx-auto" aria-hidden="true" />
            <CardTitle className="text-3xl font-bold text-primary">
              {translations.projectSelection.title}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              {translations.projectSelection.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex justify-center mb-6">
              <Button asChild size="lg" className="px-8 py-3">
                <Link href={routes.create()}>{translations.projectSelection.createNew}</Link>
              </Button>
            </div>

            {servers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {translations.projectSelection.noProjects}
              </div>
            ) : (
              <div className="grid gap-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                  {translations.projectSelection.selectProject}
                </h3>
                {servers.map((server) => (
                  <ServerCard key={server.path} server={server} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { useLanguage } from "@/hooks/useLanguage";
import { routes } from "@/lib/router";

interface NotFoundPageProps {
  description?: string;
}

export function NotFoundPage({ description }: NotFoundPageProps) {
  const { translations } = useLanguage();

  return (
    <div className="app-page flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-primary">{translations.common.notFoundTitle}</h1>
        <p className="text-muted-foreground">
          {description ?? translations.common.notFoundDescription}
        </p>
        <Button asChild>
          <Link href={routes.projects()}>{translations.common.backToProjects}</Link>
        </Button>
      </div>
    </div>
  );
}

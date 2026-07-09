import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { SkipLinkTarget } from '@/components/a11y/SkipLink';
import { SeoHead } from '@/components/seo/SeoHead';

interface LegalPageLayoutProps {
  title: string;
  description: string;
  path: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, description, path, children }: LegalPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <>
      <SeoHead title={title} description={description} path={path} />

      <div className="min-h-screen bg-background">
        <Header />
        <main id={SkipLinkTarget} className="container max-w-3xl mx-auto px-4 pt-24 pb-16">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-6 -ml-2 gap-2 text-muted-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour
          </Button>

          <article className="legal-prose">{children}</article>
        </main>
      </div>
    </>
  );
}

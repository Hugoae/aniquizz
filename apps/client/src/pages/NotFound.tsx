import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import { captureClientError } from '@/lib/errorReporter';
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    captureClientError(new Error('404 route not found'), { pathname: location.pathname });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SeoHead title={PAGE_TITLES.notFound} noindex />
      <main id="main-content" className="text-center">        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Page introuvable</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Retour à l&apos;accueil
        </Link>
      </main>
    </div>
  );
};

export default NotFound;

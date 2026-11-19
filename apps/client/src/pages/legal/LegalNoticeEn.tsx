import { Link } from 'react-router-dom';
import { LegalPageLayout } from '@/features/legal/components/LegalPageLayout';
import { PAGE_TITLES } from '@/lib/site';

export function LegalNoticeEn() {
  return (
    <LegalPageLayout
      title={PAGE_TITLES.legal}
      description="Legal information about the publisher and hosting of AniQuizz."
      path="/legal/mentions"
    >
      <h1>Legal notice</h1>
      <p className="lead text-muted-foreground">
        In accordance with French law no. 2004-575 of 21 June 2004.
      </p>

      <h2>Site publisher</h2>
      <p>
        <strong>AniQuizz</strong> — independent editorial project.
        <br />
        Contact:{' '}
        <a
          href="https://github.com/Hugoae/aniquizz/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://github.com/Hugoae/aniquizz/issues
        </a>
      </p>

      <h2>Publication director</h2>
      <p>AniQuizz team (contact through GitHub Issues).</p>

      <h2>Hosting</h2>
      <ul>
        <li>
          <strong>Web application (client):</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina,
          CA 91723, United States —{' '}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
        </li>
        <li>
          <strong>API and realtime:</strong> Render Services Inc. —{' '}
          <a href="https://render.com" target="_blank" rel="noopener noreferrer">
            render.com
          </a>
        </li>
        <li>
          <strong>Database and authentication:</strong> Supabase Inc. —{' '}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
            supabase.com
          </a>
        </li>
        <li>
          <strong>Media (audio/video):</strong> Cloudflare, Inc. (R2) —{' '}
          <a href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer">
            cloudflare.com
          </a>
        </li>
      </ul>

      <h2>Intellectual property</h2>
      <p>
        The AniQuizz site (structure, design, code) is protected. Unauthorised reproduction is
        forbidden. Anime media belong to their respective owners.
      </p>

      <h2>Personal data</h2>
      <p>
        See the{' '}
        <Link
          to="/legal/confidentialite"
          className="text-primary underline-offset-2 hover:underline"
        >
          privacy policy
        </Link>{' '}
        for how data is processed and for your GDPR rights.
      </p>

      <h2>Reports</h2>
      <p>
        To report content or abusive behaviour, use in-game moderation or open an issue on GitHub.
      </p>
    </LegalPageLayout>
  );
}

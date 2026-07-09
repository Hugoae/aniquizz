import { Link } from 'react-router-dom';
import { LegalPageLayout } from '@/features/legal/components/LegalPageLayout';
import { PAGE_TITLES } from '@/lib/site';

export default function LegalNoticePage() {
  return (
    <LegalPageLayout
      title={PAGE_TITLES.legal}
      description="Informations légales sur l'éditeur et l'hébergement d'AniQuizz."
      path="/legal/mentions"
    >
      <h1>Mentions légales</h1>
      <p className="lead text-muted-foreground">Conformément à la loi n° 2004-575 du 21 juin 2004.</p>

      <h2>Éditeur du site</h2>
      <p>
        <strong>AniQuizz</strong> — projet éditorial indépendant.
        <br />
        Contact :{' '}
        <a href="https://github.com/Hugoae/aniquizz/issues" target="_blank" rel="noopener noreferrer">
          https://github.com/Hugoae/aniquizz/issues
        </a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>Équipe AniQuizz (contact via GitHub Issues).</p>

      <h2>Hébergement</h2>
      <ul>
        <li>
          <strong>Application web (client) :</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina, CA
          91723, États-Unis —{' '}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
        </li>
        <li>
          <strong>API &amp; temps réel :</strong> Render Services Inc. —{' '}
          <a href="https://render.com" target="_blank" rel="noopener noreferrer">
            render.com
          </a>
        </li>
        <li>
          <strong>Base de données &amp; authentification :</strong> Supabase Inc. —{' '}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
            supabase.com
          </a>
        </li>
        <li>
          <strong>Médias (audio/vidéo) :</strong> Cloudflare, Inc. (R2) —{' '}
          <a href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer">
            cloudflare.com
          </a>
        </li>
      </ul>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble du site AniQuizz (structure, design, code) est protégé. Toute reproduction non
        autorisée est interdite. Les contenus multimédias des anime appartiennent à leurs détenteurs
        respectifs.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Voir la{' '}
        <Link to="/legal/confidentialite" className="text-primary underline-offset-2 hover:underline">
          politique de confidentialité
        </Link>{' '}
        pour le traitement des données et vos droits RGPD.
      </p>

      <h2>Signalement</h2>
      <p>
        Pour signaler un contenu ou un comportement abusif, utilisez la modération in-game ou ouvrez une
        issue sur GitHub.
      </p>
    </LegalPageLayout>
  );
}

import { LegalPageLayout } from '@/features/legal/components/LegalPageLayout';
import { PAGE_TITLES } from '@/lib/site';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title={PAGE_TITLES.privacy}
      description="Comment AniQuizz collecte, utilise et protège vos données personnelles."
      path="/legal/confidentialite"
    >
      <h1>Politique de confidentialité</h1>
      <p className="lead text-muted-foreground">
        Dernière mise à jour : 9 juillet 2026. AniQuizz est un jeu en ligne gratuit destiné à un
        public francophone.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le service AniQuizz est édité par l&apos;équipe AniQuizz. Pour toute question relative à
        vos données personnelles, contactez-nous via{' '}
        <a href="https://github.com/Hugoae/aniquizz/issues" target="_blank" rel="noopener noreferrer">
          GitHub Issues
        </a>{' '}
        (projet Hugoae/aniquizz).
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li>
          <strong>Compte :</strong> adresse e-mail, identifiant, pseudo, avatar (optionnel), mot de
          passe (hashé par Supabase Auth).
        </li>
        <li>
          <strong>Profil de jeu :</strong> XP, niveau, statistiques, historique de parties, médailles
          solo, préférences de jeu.
        </li>
        <li>
          <strong>Social :</strong> liste d&apos;amis, demandes d&apos;amitié, statut de blocage.
        </li>
        <li>
          <strong>AniList (optionnel) :</strong> nom d&apos;utilisateur AniList lié pour filtrer les
          playlists « Ma liste » — nous ne stockons pas votre mot de passe AniList.
        </li>
        <li>
          <strong>Technique :</strong> journaux serveur (adresse IP tronquée, horodatage, événements
          de jeu) pour la sécurité, la modération et le dépannage.
        </li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>Fourniture du service et exécution du contrat (création de compte, parties, classements).</li>
        <li>Intérêt légitime : sécurité, anti-triche, modération, amélioration du service.</li>
        <li>Consentement : cookies d&apos;analyse non essentiels (voir section Cookies).</li>
      </ul>

      <h2>4. Sous-traitants et hébergement</h2>
      <p>Vos données peuvent être traitées par :</p>
      <ul>
        <li>
          <strong>Supabase</strong> — authentification, base PostgreSQL, stockage avatars (UE / USA selon
          projet).
        </li>
        <li>
          <strong>Render</strong> — API et temps réel (serveur Node.js).
        </li>
        <li>
          <strong>Vercel</strong> — hébergement du site client.
        </li>
        <li>
          <strong>Cloudflare R2</strong> — fichiers audio/vidéo des openings et endings.
        </li>
        <li>
          <strong>AniList</strong> — récupération de votre liste d&apos;animes regardés (si vous liez
          votre compte).
        </li>
        <li>
          <strong>Google Fonts</strong> — polices typographiques (requête depuis votre navigateur).
        </li>
      </ul>
      <p>
        Des clauses contractuelles ou garanties appropriées s&apos;appliquent lorsque des données
        sont transférées hors de l&apos;Espace économique européen.
      </p>

      <h2>5. Durée de conservation</h2>
      <p>
        Les données de compte et de jeu sont conservées tant que votre compte est actif. Les journaux
        techniques sont conservés pour une durée limitée (généralement 30 à 90 jours), sauf obligation
        légale ou enquête de modération.
      </p>

      <h2>6. Vos droits (RGPD)</h2>
      <p>
        Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de limitation, de
        portabilité et d&apos;opposition. Pour les exercer, contactez-nous via GitHub Issues. Vous
        pouvez également introduire une réclamation auprès de la CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
          www.cnil.fr
        </a>
        ).
      </p>
      <p>
        La suppression de compte (« droit à l&apos;effacement ») sera proposée dans une mise à jour
        ultérieure du profil utilisateur.
      </p>

      <h2>7. Cookies</h2>
      <p>
        <strong>Nécessaires :</strong> session Supabase Auth, préférences essentielles au fonctionnement
        du jeu — toujours actifs.
      </p>
      <p>
        <strong>Analyse (optionnels) :</strong> mesure d&apos;audience — uniquement si vous les
        acceptez via le bandeau ou les paramètres. Aucun script d&apos;analyse tiers n&apos;est chargé
        avant votre consentement.
      </p>
      <p>
        Vous pouvez modifier votre choix à tout moment dans <strong>Paramètres → Cookies</strong>.
      </p>

      <h2>8. Sécurité</h2>
      <p>
        Nous appliquons des mesures techniques et organisationnelles : authentification JWT, politiques
        RLS sur la base de données, chiffrement HTTPS, modération et journalisation sans secrets.
      </p>

      <h2>9. Mineurs</h2>
      <p>
        AniQuizz n&apos;est pas destiné aux enfants de moins de 15 ans sans accord parental. Si vous
        pensez qu&apos;un mineur nous a transmis des données, contactez-nous pour suppression.
      </p>
    </LegalPageLayout>
  );
}

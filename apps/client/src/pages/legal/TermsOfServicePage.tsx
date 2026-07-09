import { LegalPageLayout } from '@/features/legal/components/LegalPageLayout';
import { PAGE_TITLES } from '@/lib/site';

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title={PAGE_TITLES.terms}
      description="Règles d'utilisation du service AniQuizz."
      path="/legal/cgu"
    >
      <h1>Conditions générales d&apos;utilisation</h1>
      <p className="lead text-muted-foreground">Dernière mise à jour : 9 juillet 2026.</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l&apos;accès et l&apos;utilisation d&apos;AniQuizz, jeu de
        blind test anime en solo et multijoueur. En créant un compte ou en utilisant le service, vous
        acceptez ces conditions.
      </p>

      <h2>2. Compte utilisateur</h2>
      <ul>
        <li>Vous devez fournir une adresse e-mail valide et un pseudo approprié.</li>
        <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
        <li>Un compte par personne ; les comptes automatisés ou bots de triche sont interdits.</li>
      </ul>

      <h2>3. Comportement acceptable</h2>
      <p>Il est interdit de :</p>
      <ul>
        <li>Tricher, exploiter des failles ou perturber le jeu (anti-triche actif).</li>
        <li>Harceler, insulter ou diffuser du contenu illégal dans le chat.</li>
        <li>Usurper l&apos;identité d&apos;autres joueurs ou du staff.</li>
        <li>Scraper massivement le catalogue ou surcharger l&apos;infrastructure.</li>
      </ul>
      <p>
        La modération peut appliquer mute, ban temporaire ou permanent, et déconnexion immédiate en cas
        de violation grave.
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        AniQuizz, son interface et son code sont protégés. Les extraits audio/vidéo proviennent de
        sources tierces (AnimeThemes, etc.) et restent la propriété de leurs ayants droit ; le service
        est un outil de quiz à but non commercial / éducatif culturel. Les titres d&apos;anime et
        métadonnées proviennent notamment d&apos;AniList.
      </p>

      <h2>5. Disponibilité</h2>
      <p>
        Le service est fourni « en l&apos;état », sans garantie de disponibilité permanente. Des
        maintenance, mises à jour ou interruptions peuvent survenir (version alpha).
      </p>

      <h2>6. Limitation de responsabilité</h2>
      <p>
        Dans les limites autorisées par la loi, AniQuizz ne saurait être tenu responsable des dommages
        indirects liés à l&apos;utilisation du service. Aucun gain financier n&apos;est garanti.
      </p>

      <h2>7. Résiliation</h2>
      <p>
        Vous pouvez cesser d&apos;utiliser le service à tout moment. Nous pouvons suspendre ou
        supprimer un compte en cas de violation des présentes conditions.
      </p>

      <h2>8. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de litige, les tribunaux
        français seront compétents, sous réserve des dispositions impératives protectrices des
        consommateurs.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions :{' '}
        <a href="https://github.com/Hugoae/aniquizz/issues" target="_blank" rel="noopener noreferrer">
          GitHub Issues — Hugoae/aniquizz
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}

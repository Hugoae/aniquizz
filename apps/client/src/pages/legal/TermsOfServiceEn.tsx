import { LegalPageLayout } from '@/features/legal/components/LegalPageLayout';
import { PAGE_TITLES } from '@/lib/site';

export function TermsOfServiceEn() {
  return (
    <LegalPageLayout
      title={PAGE_TITLES.terms}
      description="Rules for using the AniQuizz service."
      path="/legal/cgu"
    >
      <h1>Terms of use</h1>
      <p className="lead text-muted-foreground">Last updated: 12 September 2026.</p>

      <h2>1. Purpose</h2>
      <p>
        These terms govern access to and use of AniQuizz, a solo and multiplayer anime music quiz.
        By creating an account or using the service, you accept these terms.
      </p>

      <h2>2. User account</h2>
      <ul>
        <li>You must provide a valid email address and an appropriate username.</li>
        <li>You are responsible for keeping your credentials private.</li>
        <li>One account per person. Automated accounts and cheat bots are forbidden.</li>
      </ul>

      <h2>3. Acceptable behaviour</h2>
      <p>You must not:</p>
      <ul>
        <li>Cheat, exploit bugs, or disrupt the game (anti-cheat is active).</li>
        <li>Harass, insult, or share illegal content in the chat.</li>
        <li>Impersonate other players or the staff.</li>
        <li>Scrape the catalogue at scale or overload the infrastructure.</li>
      </ul>
      <p>
        Moderation may mute, temporarily or permanently ban, and disconnect you immediately in case
        of a serious breach.
      </p>

      <h2>4. Intellectual property</h2>
      <p>
        AniQuizz, its interface, and its code are protected. Audio and video clips come from third
        parties (AnimeThemes and others) and remain the property of their rights holders. The
        service is a non-commercial cultural quiz. Anime titles and metadata come in particular from
        AniList.
      </p>

      <h2>5. Voluntary support</h2>
      <p>
        AniQuizz may offer a Ko-fi link so you can support the project with a free, one-off
        contribution. That contribution is optional, comes with no reward, and grants no advantage,
        content, or special access. AniQuizz stays free and without ads.
      </p>
      <p>
        Payments are handled outside AniQuizz by Ko-fi and PayPal, under their own terms. AniQuizz
        does not collect or store payment details and does not issue a receipt that qualifies for a
        tax deduction.
      </p>

      <h2>6. Availability</h2>
      <p>
        The service is provided “as is”, with no guarantee of permanent availability. Maintenance,
        updates, or interruptions can happen (alpha version).
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        Within the limits allowed by law, AniQuizz is not liable for indirect damage related to use
        of the service. No financial gain is guaranteed.
      </p>

      <h2>8. Ending use</h2>
      <p>
        You can stop using the service at any time. We can suspend or delete an account if these
        terms are breached.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by French law. In case of a dispute, the French courts have
        jurisdiction, subject to mandatory rules that protect consumers.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions:{' '}
        <a
          href="https://github.com/Hugoae/aniquizz/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Issues — Hugoae/aniquizz
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}

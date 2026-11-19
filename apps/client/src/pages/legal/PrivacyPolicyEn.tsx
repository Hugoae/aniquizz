import { LegalPageLayout } from '@/features/legal/components/LegalPageLayout';
import { PAGE_TITLES } from '@/lib/site';

export function PrivacyPolicyEn() {
  return (
    <LegalPageLayout
      title={PAGE_TITLES.privacy}
      description="How AniQuizz collects, uses, and protects your personal data."
      path="/legal/confidentialite"
    >
      <h1>Privacy policy</h1>
      <p className="lead text-muted-foreground">
        Last updated: 12 September 2026. AniQuizz is a free online game. The interface is available
        in French and English.
      </p>

      <h2>1. Who is responsible</h2>
      <p>
        The AniQuizz service is published by the AniQuizz team. For any question about your personal
        data, contact us through{' '}
        <a
          href="https://github.com/Hugoae/aniquizz/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Issues
        </a>{' '}
        (project Hugoae/aniquizz).
      </p>

      <h2>2. Data we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> email address, identifier, username, avatar (optional), password
          (hashed by Supabase Auth).
        </li>
        <li>
          <strong>Game profile:</strong> XP, level, stats, match history, solo medals, game
          preferences, and the interface language you choose.
        </li>
        <li>
          <strong>Social:</strong> friends list, friend requests, block status, and visibility
          audiences (online status, recent history, invites).
        </li>
        <li>
          <strong>AniList / MyAnimeList lists (optional):</strong> linked usernames used to filter
          “My list” mode. We do not store your passwords or the full anime list.
        </li>
        <li>
          <strong>Ko-fi support (optional):</strong> if you choose to support the project, Ko-fi and
          PayPal process the payment and may send the publisher your display name, email, amount,
          and message. AniQuizz does not collect or store your payment details.
        </li>
        <li>
          <strong>Technical:</strong> server logs (truncated IP address, timestamp, game events) for
          security, moderation, and troubleshooting.
        </li>
      </ul>

      <h2>3. Purposes and legal bases</h2>
      <ul>
        <li>Providing the service and performing the contract (account, matches, leaderboards).</li>
        <li>Legitimate interest: security, anti-cheat, moderation, and improving the service.</li>
        <li>Consent: non-essential analytics cookies (see Cookies).</li>
        <li>Handling voluntary support and meeting applicable accounting and tax duties.</li>
      </ul>

      <h2>4. Processors and hosting</h2>
      <p>Your data may be processed by:</p>
      <ul>
        <li>
          <strong>Supabase</strong> — authentication, PostgreSQL database, avatar storage (EU / US
          depending on the project).
        </li>
        <li>
          <strong>Render</strong> — API and realtime (Node.js server).
        </li>
        <li>
          <strong>Vercel</strong> — hosting of the client site.
        </li>
        <li>
          <strong>Cloudflare R2</strong> — audio and video files for openings and endings.
        </li>
        <li>
          <strong>AniList / MyAnimeList</strong> — fetching your watched anime list if you link an
          account. Only one source is active at a time.
        </li>
        <li>
          <strong>Ko-fi / PayPal</strong> — external support page and payment processing. Their own
          privacy policies apply.
        </li>
        <li>
          <strong>Google Fonts</strong> — typefaces requested from your browser.
        </li>
      </ul>
      <p>
        Appropriate contractual clauses or safeguards apply when data is transferred outside the
        European Economic Area.
      </p>

      <h2>5. How long we keep it</h2>
      <p>
        Account and game data are kept while your account is active. Technical logs are kept for a
        limited time (generally 30 to 90 days), unless the law or a moderation investigation
        requires longer. Records related to support payments are kept for the period required by
        applicable accounting and tax rules.
      </p>

      <h2>6. Your rights (GDPR)</h2>
      <p>
        You have the rights of access, rectification, erasure, restriction, portability, and
        objection. To use them, contact us through GitHub Issues. You can also lodge a complaint
        with the CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
          www.cnil.fr
        </a>
        ).
      </p>
      <p>
        Account deletion (“right to erasure”) is available from your profile: the <strong>⋮</strong>{' '}
        menu at the top right → <strong>Delete my account</strong> (confirm with your username and
        password).
      </p>

      <h2>7. Cookies</h2>
      <p>
        <strong>Necessary:</strong> Supabase Auth session and preferences the game needs to run —
        always on.
      </p>
      <p>
        <strong>Analytics (optional):</strong> visit statistics through Vercel Web Analytics, only
        if you accept them in the banner or in settings. The script is not loaded before you
        consent.
      </p>
      <p>
        You can change your choice at any time in <strong>Settings → Cookies</strong>.
      </p>

      <h2>8. Security</h2>
      <p>
        We apply technical and organisational measures: JWT authentication, row-level security on
        the database, HTTPS, and moderation logs that do not contain secrets.
      </p>

      <h2>9. Minors</h2>
      <p>
        AniQuizz is not intended for children under 15 without parental consent. If you believe a
        minor has sent us data, contact us so we can delete it.
      </p>
    </LegalPageLayout>
  );
}

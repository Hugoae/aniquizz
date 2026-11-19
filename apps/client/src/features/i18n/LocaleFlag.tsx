import type { AppLocale } from '@aniquizz/shared';

/** Real flag colors, not theme tokens. Small enough to sit in the header control. */
export function LocaleFlag({ code }: { code: AppLocale }) {
  return (
    <svg
      viewBox="0 0 18 12"
      className="h-3 w-[1.125rem] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-foreground/15"
      aria-hidden
    >
      {code === 'fr' ? <FranceFlag /> : <UsFlag />}
    </svg>
  );
}

function FranceFlag() {
  return (
    <>
      <rect width="6" height="12" fill="#0055A4" />
      <rect x="6" width="6" height="12" fill="#FFFFFF" />
      <rect x="12" width="6" height="12" fill="#EF4135" />
    </>
  );
}

function UsFlag() {
  return (
    <>
      <rect width="18" height="12" fill="#B22234" />
      <rect y="1.35" width="18" height="0.92" fill="#FFFFFF" />
      <rect y="3.2" width="18" height="0.92" fill="#FFFFFF" />
      <rect y="5.05" width="18" height="0.92" fill="#FFFFFF" />
      <rect y="6.9" width="18" height="0.92" fill="#FFFFFF" />
      <rect y="8.75" width="18" height="0.92" fill="#FFFFFF" />
      <rect y="10.6" width="18" height="0.92" fill="#FFFFFF" />
      <rect width="7.6" height="6.5" fill="#3C3B6E" />
    </>
  );
}

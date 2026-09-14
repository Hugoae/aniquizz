export const SkipLinkTarget = 'main-content';

/**
 * Stay `fixed` + above the header (`z-50`) even while visually hidden.
 * Tailwind `sr-only` is `position: absolute` at the origin — the 1px box sits
 * under `header.fixed` and mouse activation never reaches the control.
 */
export function SkipLink() {
  return (
    <a
      href={`#${SkipLinkTarget}`}
      className="fixed left-4 -top-24 z-[200] rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground outline-none focus:top-4 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    >
      Aller au contenu principal
    </a>
  );
}

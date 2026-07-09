export const SkipLinkTarget = 'main-content';

export function SkipLink() {
  return (
    <a
      href={`#${SkipLinkTarget}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    >
      Aller au contenu principal
    </a>
  );
}

let shellDismissed = false;

/** Main Tailwind bundle injected by Vite (app-shell-css-first plugin). */
function getAppStylesheetLink(): HTMLLinkElement | null {
  return document.querySelector('link[rel="stylesheet"][href*="/assets/index"]');
}

/** Wait until the app CSS bundle is downloaded and parsed (module JS can run before this). */
function waitForAppStyles(): Promise<void> {
  const link = getAppStylesheetLink();
  if (!link) return Promise.resolve();

  if (link.sheet) return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => resolve();
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', done, { once: true });
  });
}

/**
 * Remove the static HTML shell only once Tailwind is ready underneath.
 * Keeps #app-shell covering #root until styled React is paintable — avoids
 * the brief unstyled h1 flash when the module script wins the network race.
 */
export async function dismissAppShellWhenReady(): Promise<void> {
  if (shellDismissed) return;

  await waitForAppStyles();
  // One frame so React's committed tree picks up the newly parsed stylesheet.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  shellDismissed = true;
  document.getElementById('app-shell')?.remove();
}

/** @deprecated Use dismissAppShellWhenReady — kept for tests. */
export function dismissAppShell(): void {
  document.getElementById('app-shell')?.remove();
}

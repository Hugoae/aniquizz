let shellDismissed = false;

/** Main Tailwind bundle injected by Vite (app-shell-css-first plugin). */
function getAppStylesheetLink(): HTMLLinkElement | null {
  return document.querySelector('link[rel="stylesheet"][href*="/assets/index"]');
}

/** Wait until the app CSS bundle is downloaded and parsed (module JS can run before this). */
function waitForAppStylesheet(): Promise<void> {
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
 * True when the mounted Home tree has Tailwind utilities applied (not just link.sheet).
 * Guards against the brief unstyled flash: huge Lucide SVGs, raw button text, etc.
 */
function isHomePaintReady(): boolean {
  const h1 = document.querySelector('#root h1');
  if (!h1) return false;

  const title = getComputedStyle(h1);
  const titlePx = parseFloat(title.fontSize);
  if (titlePx < 40) return false;

  const playBtn = document.querySelector('#root button');
  if (!playBtn) return false;

  const btn = getComputedStyle(playBtn);
  if (btn.display === 'inline') return false;
  if (parseFloat(btn.height) < 48) return false;

  const icon = playBtn.querySelector('svg');
  if (icon) {
    const iconBox = icon.getBoundingClientRect();
    if (iconBox.width > 80 || iconBox.height > 80) return false;
  }

  return true;
}

async function waitForHomePaintReady(): Promise<void> {
  await waitForAppStylesheet();

  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    if (isHomePaintReady()) return;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

/**
 * Remove the static HTML shell only once styled React is confirmed underneath.
 * #root stays hidden (inline critical CSS) until this runs.
 */
export async function dismissAppShellWhenReady(): Promise<void> {
  if (shellDismissed) return;

  await waitForHomePaintReady();

  shellDismissed = true;
  document.getElementById('root')?.classList.add('app-ready');
  document.getElementById('app-shell')?.remove();
}

/** @deprecated Use dismissAppShellWhenReady — kept for tests. */
export function dismissAppShell(): void {
  document.getElementById('app-shell')?.remove();
}

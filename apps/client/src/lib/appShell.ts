let shellDismissed = false;

/** Main Tailwind bundle injected by Vite (app-shell-css-first plugin). */
export function getAppStylesheetLink(): HTMLLinkElement | null {
  return document.querySelector('link[rel="stylesheet"][href*="/assets/index"]');
}

/** True when Tailwind utilities from the Vite CSS bundle are applied (link.sheet alone is not enough). */
export function isTailwindReady(): boolean {
  const probe = document.getElementById('tw-probe');
  if (!probe) return Boolean(getAppStylesheetLink()?.sheet);
  return getComputedStyle(probe).display === 'flex';
}

async function waitForTailwindReady(): Promise<void> {
  if (isTailwindReady()) return;

  await new Promise<void>((resolve) => {
    const tick = () => {
      if (isTailwindReady()) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/** Wait until the app CSS bundle is downloaded and parsed (module JS can run before this). */
export async function waitForAppStylesheet(): Promise<void> {
  const link = getAppStylesheetLink();
  if (!link) {
    // Dev: Vite injects CSS via the JS import — one frame is enough after module eval.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    return;
  }

  if (!link.sheet) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      link.addEventListener('load', done, { once: true });
      link.addEventListener('error', done, { once: true });
    });
  }

  await waitForTailwindReady();
}

/**
 * True when the mounted Home tree has Tailwind utilities applied (not just link.sheet).
 * Targets the "Jouer" CTA specifically — generic button probes false-positive on header/cookie UI.
 */
export function isHomeStyled(): boolean {
  const h1 = document.querySelector('#root h1.font-display');
  if (!h1) return false;

  const titlePx = parseFloat(getComputedStyle(h1).fontSize);
  if (titlePx < 44) return false;

  const playBtn = [...document.querySelectorAll('#root button')].find((btn) =>
    btn.textContent?.trim().includes('Jouer'),
  );
  if (!playBtn) return false;

  const btn = getComputedStyle(playBtn);
  if (btn.display !== 'flex' && btn.display !== 'inline-flex') return false;
  if (parseFloat(btn.height) < 56) return false;

  const bg = btn.backgroundColor;
  if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') return false;

  const icon = playBtn.querySelector('svg');
  if (icon) {
    const iconBox = icon.getBoundingClientRect();
    if (iconBox.width > 48 || iconBox.height > 48) return false;
  }

  return true;
}

function waitForHomeStyled(): Promise<void> {
  return new Promise((resolve) => {
    const tick = () => {
      if (isHomeStyled()) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function isLandingRoute(): boolean {
  const path = window.location.pathname;
  return path === '/' || path === '';
}

/**
 * Remove the static HTML shell only once styled React is confirmed underneath.
 * The shell stays on top (z-index) until then — never times out into a broken layout.
 */
export async function dismissAppShellWhenReady(): Promise<void> {
  if (shellDismissed) return;

  if (isLandingRoute()) {
    await waitForHomeStyled();
  } else {
    // Deep links skip Home — Tailwind ready is enough before revealing #root.
    await waitForTailwindReady();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  shellDismissed = true;
  document.getElementById('app-shell')?.remove();
}

/** @deprecated Use dismissAppShellWhenReady — kept for tests. */
export function dismissAppShell(): void {
  document.getElementById('app-shell')?.remove();
}

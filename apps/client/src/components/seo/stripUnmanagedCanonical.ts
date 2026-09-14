/** Keep a single canonical: prefer the href Helmet just set. */
export function stripUnmanagedCanonicalLinks(
  preferredHref?: string,
  root: ParentNode = document,
): void {
  const all = [...root.querySelectorAll('link[rel="canonical"]')];
  if (all.length <= 1) {
    if (all.length === 1 && preferredHref) all[0]?.setAttribute('href', preferredHref);
    return;
  }
  const preferred = preferredHref
    ? all.find((el) => el.getAttribute('href') === preferredHref)
    : undefined;
  const kept = preferred ?? all.find((el) => el.hasAttribute('data-rh')) ?? all[all.length - 1];
  for (const el of all) {
    if (el !== kept) el.remove();
  }
  if (preferredHref && kept) kept.setAttribute('href', preferredHref);
}

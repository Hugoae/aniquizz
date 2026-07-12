/** Remove the static HTML first-paint shell once React has committed the real UI. */
export function dismissAppShell(): void {
  document.getElementById('app-shell')?.remove();
}

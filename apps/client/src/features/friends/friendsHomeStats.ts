/** Home-stats polling for the friends bubble — not the hub mode-select teaser. */
export function shouldIntervalPollFriendsHomeStats(pathname: string, panelOpen: boolean): boolean {
  const onHome = pathname === '/' || pathname === '';
  return onHome || panelOpen;
}
